"""Image upload and path regression tests without a database dependency."""
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory, SpooledTemporaryFile
import unittest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException, UploadFile
from pydantic import ValidationError
from app.routers import admin
from app.routers.auth import require_admin
from app.services.images import image_extension, normalize_image_url, MAX_IMAGE_BYTES

ROOT = Path(__file__).resolve().parents[2]
JPEG = (ROOT / 'frontend/public/images/VGA_MSI_RTX_3060_Ventus_2X_12GB.jpg').read_bytes()


def complete(coroutine):
    try: coroutine.send(None)
    except StopIteration as finished: return finished.value
    raise AssertionError('Unexpected pending external IO')


class ImageTests(unittest.TestCase):
    def test_existing_backend_image_location(self):
        from app.main import images_dir
        self.assertEqual(images_dir, ROOT / 'images/images')
        self.assertTrue((images_dir / 'VGA_MSI_RTX_3060_Ventus_2X_12GB.jpg').exists())

    def test_actual_jpeg_and_bad_file(self):
        self.assertEqual(image_extension(JPEG), '.jpg')
        for data in (b'',b'<svg xmlns="http://www.w3.org/2000/svg"></svg>', b'not an image.jpg', b'\xff\xd8\xffTRUNCATED'):
            with self.subTest(data=data), self.assertRaises(HTTPException) as e: image_extension(data)
            self.assertEqual(e.exception.status_code,415)

    def test_maximum_size(self):
        with self.assertRaises(HTTPException) as e: image_extension(b'x'*(MAX_IMAGE_BYTES+1))
        self.assertEqual(e.exception.status_code,413)

    def test_url_and_local_paths(self):
        self.assertEqual(normalize_image_url(' https://example.com/a.jpg '),'https://example.com/a.jpg')
        self.assertEqual(normalize_image_url('/images/images/a.jpg'),'/images/a.jpg')
        for value in ('file:///C:/image.jpg','C:\\images\\image.jpg','javascript:alert(1)','//example.com/a.jpg','data:image/svg+xml;base64,abc'):
            with self.subTest(value=value), self.assertRaises(ValueError): normalize_image_url(value)

    def test_upload_ignores_client_filename_and_preserves_bytes(self):
        with TemporaryDirectory(prefix='product-image-test-') as directory:
            buffer=SpooledTemporaryFile(max_size=MAX_IMAGE_BYTES)
            buffer.write(JPEG); buffer.seek(0)
            upload=UploadFile(filename='../../dangerous.html',file=buffer)
            with patch.object(admin,'UPLOAD_DIR',Path(directory)), patch.object(admin,'run_in_threadpool',AsyncMock(side_effect=lambda fn: fn())):
                result=complete(admin.upload_product_image(upload))
            name=result['url'].rsplit('/',1)[1]
            self.assertRegex(name,r'^[0-9a-f]{32}\.jpg$')
            self.assertEqual((Path(directory)/name).read_bytes(),JPEG)
            self.assertTrue(upload.file.closed)

    def test_upload_route_requires_admin(self):
        route=next(r for r in admin.router.routes if r.path.endswith('/uploads/images'))
        self.assertTrue(any(d.call is require_admin for d in route.dependant.dependencies))

    def test_product_rejects_invalid_image_urls(self):
        base=dict(sku='IMAGE_TEST',name='Test',category={'id':'A','name':'A'},brand={'id':'B','name':'B'},price=1,stock=1)
        with self.assertRaises(ValidationError): admin.ProductWrite(**base,images=['C:\\image.jpg'])
        self.assertEqual(admin.ProductWrite(**base,images=[' /images/a.jpg ','/images/a.jpg']).images,['/images/a.jpg'])
