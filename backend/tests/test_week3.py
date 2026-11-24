import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from bson import ObjectId
from fastapi import HTTPException
from pydantic import ValidationError
from app.models.user import UserResponse
from app.routers import admin, analytics, orders
from app.routers.auth import require_admin

class ValidationTests(unittest.TestCase):
    def test_product_values(self):
        base=dict(sku='TEST',name='CPU',category={'id':'LSP01','name':'CPU'},brand={'id':'B','name':'Brand'},price=100,stock=1)
        for field,value in [('price',-1),('price',float('inf')),('stock',1.5),('specs',{'$bad':1}),('category',{'id':'','name':''})]:
            with self.subTest(field=field), self.assertRaises(ValidationError): admin.ProductWrite(**{**base,field:value})
        self.assertEqual(admin.ProductWrite(**base,specs={'socket':'AM5','tdp_watt':65}).specs['tdp_watt'],65)

    def test_customer_cannot_admin(self):
        with self.assertRaises(HTTPException) as e: require_admin(UserResponse(id=str(ObjectId()),username='buyer',email='buyer@example.com',role='customer'))
        self.assertEqual(e.exception.status_code,403)

class RouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_months_zero_filled(self):
        db=SimpleNamespace(orders=SimpleNamespace(aggregate=lambda _:SimpleNamespace(to_list=AsyncMock(return_value=[{'_id':3,'revenue':125}]))))
        with patch.object(analytics,'get_database',return_value=db): rows=await analytics.monthly_revenue(2026)
        self.assertEqual(len(rows),12)
        self.assertEqual(rows[2],{'month':'2026-03','revenue':125})
        self.assertEqual(rows[0]['revenue'],0)

    async def test_edit_sku_cannot_change(self):
        data=admin.ProductWrite(sku='NEW',name='CPU',category={'id':'A','name':'CPU'},brand={'id':'B','name':'Brand'},price=1,stock=1)
        with self.assertRaises(HTTPException) as e: await admin.edit_product('OLD',data)
        self.assertEqual(e.exception.status_code,422)

    async def test_delivered_order_cannot_cancel(self):
        db=self.database({'status':'Đã giao','items':[]})
        with patch.object(orders,'get_database',return_value=db),self.assertRaises(HTTPException): await orders.update_order_status('CODE','Đã hủy')
        db.products.update_one.assert_not_awaited()

    async def test_cancel_restores_stock_once(self):
        doc={'_id':ObjectId(),'status':'Chờ xác nhận','items':[{'sku':'SP01','quantity':2}]}
        db=self.database(doc)
        with patch.object(orders,'get_database',return_value=db):
            await orders.update_order_status('CODE','Đã hủy')
            doc['status']='Đã hủy'
            await orders.update_order_status('CODE','Đã hủy')
        db.products.update_one.assert_awaited_once()
        self.assertEqual(db.products.update_one.call_args.args[1],{'$inc':{'stock':2}})

    async def test_cod_delivery_marks_paid(self):
        db=self.database({'_id':ObjectId(),'status':'Đang giao','payment_method':'COD','items':[]})
        with patch.object(orders,'get_database',return_value=db): await orders.update_order_status('CODE','Đã giao')
        changes=db.orders.update_one.call_args.args[1]['$set']
        self.assertEqual(changes['payment_status'],'Đã thanh toán')
        self.assertIn('dates.paid_at',changes)

    def database(self,doc):
        class Session:
            async def __aenter__(self): return self
            async def __aexit__(self,*args): pass
            async def with_transaction(self,callback): return await callback(self)
        return SimpleNamespace(client=SimpleNamespace(start_session=AsyncMock(return_value=Session())),orders=SimpleNamespace(find_one=AsyncMock(return_value=doc),update_one=AsyncMock()),products=SimpleNamespace(update_one=AsyncMock()))

# Run these against a dedicated Atlas/replica-set URI through TEST_MONGODB_URI.
from tests import test_week2 as week2

@unittest.skipUnless(__import__('os').getenv('TEST_MONGODB_URI'), 'TEST_MONGODB_URI is required')
class AdminMongoTests(week2.MongoDBFlowTests):
    async def test_admin_crud_and_snapshot_category_revenue(self):
        product = await self.db.products.find_one({'sku':'SP01'})
        result = await orders.create_order(self.payload(),self.buyer)
        self.assertEqual(result['items'][0]['category'],product['category'])
        with patch.object(admin,'get_database',return_value=self.db):
            data=admin.ProductWrite(sku='WEEK3_TEST',name='Test CPU',category={'id':'LSP01','name':'CPU'},brand={'id':'B','name':'Brand'},price=100,stock=3)
            await admin.create_product(data)
            data.price=200
            await admin.edit_product(data.sku,data)
            found=await admin.list_products(q='WEEK3_TEST',skip=0,limit=20)
            self.assertEqual(found['items'][0]['price'],200)
            await admin.delete_product(data.sku)
            self.assertIsNone(await self.db.products.find_one({'sku':data.sku}))
        with patch.object(analytics,'get_database',return_value=self.db):
            self.assertEqual((await analytics.get_analytics_overview())['total_revenue'],0)
            await orders.update_order_status(result['order_code'],'Đang giao')
            await orders.update_order_status(result['order_code'],'Đã giao')
            revenue=await analytics.category_revenue()
            self.assertEqual(revenue[0]['name'],product['category']['name'])
            self.assertEqual(revenue[0]['revenue'],product['price'])
            await self.db.products.update_one({'sku':'SP01'},{'$set':{'category':{'id':'NEW','name':'Changed'},'price':1}})
            self.assertEqual(await analytics.category_revenue(),revenue)
            self.assertEqual((await analytics.get_analytics_overview())['total_revenue'],product['price'])
