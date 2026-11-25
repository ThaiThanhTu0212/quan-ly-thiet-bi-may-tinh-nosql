"""Reproducible before/after index experiment in a temporary database only."""
import json
import sys
import uuid
from pathlib import Path
from datetime import datetime, timezone
from pymongo import MongoClient
from pymongo.errors import PyMongoError
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.config import settings


def main():
    name = 'week3_benchmark_' + uuid.uuid4().hex
    output = Path(__file__).resolve().parents[2] / 'docs' / 'index-benchmark.json'
    client = None
    created = False
    try:
        client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=8000, connectTimeoutMS=8000)
        client.admin.command('ping')
        db = client[name]
        db.products.insert_many([{'sku': f'BENCH{i:05}', 'name': f'CPU benchmark {i}', 'specs': {'socket': 'AM5' if i % 100 == 0 else 'LGA1700'}, 'price': i} for i in range(10000)])
        created = True
        query = {'specs.socket': 'AM5'}
        before = db.command('explain', {'find': 'products', 'filter': query}, verbosity='executionStats')
        db.products.create_index([('specs.$**', 1)], name='idx_wildcard_specs')
        after = db.command('explain', {'find': 'products', 'filter': query, 'hint': 'idx_wildcard_specs'}, verbosity='executionStats')
        result = {'measured_at': datetime.now(timezone.utc).isoformat(), 'dataset': '10000 synthetic products, 100 matching AM5', 'query': query,
                  'method': 'Before index creation versus after wildcard index creation with explicit hint; identical isolated dataset.',
                  'before': before, 'after': after}
        output.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
        from html import escape
        rows = ''.join('<tr><td>' + key + '</td><td>' + str(before['executionStats'][key]) + '</td><td>' + str(after['executionStats'][key]) + '</td></tr>' for key in ['nReturned', 'totalDocsExamined', 'totalKeysExamined', 'executionTimeMillis'])
        output.with_suffix('.html').write_text(
            '<!doctype html><html lang="vi"><meta charset="utf-8"><title>Đối chiếu index MongoDB</title>'
            '<style>body{font:16px system-ui;max-width:1100px;margin:40px auto;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:12px;text-align:left}pre{background:#f1f5f9;padding:20px;overflow:auto}</style>'
            '<h1>Đối chiếu index MongoDB</h1><p>Dữ liệu tổng hợp 10.000 sản phẩm. Trước khi tạo index và sau khi tạo wildcard index với hint. Kết quả đo thực tế, không đại diện toàn bộ tải ứng dụng.</p>'
            '<table><tr><th>Chỉ số</th><th>Trước index</th><th>Sau index</th></tr>' + rows + '</table>'
            '<h2>Trước index</h2><pre>' + escape(json.dumps(before, indent=2, default=str)) + '</pre>'
            '<h2>Sau index</h2><pre>' + escape(json.dumps(after, indent=2, default=str)) + '</pre></html>', encoding='utf-8')
        for label, report in [('before', before), ('after', after)]:
            stats = report['executionStats']
            print(label, {k: stats[k] for k in ['nReturned','totalDocsExamined','totalKeysExamined','executionTimeMillis']})
        print('Saved docs/index-benchmark.json; no credentials included.')
    except PyMongoError as exc:
        print('Benchmark unavailable:', type(exc).__name__, file=sys.stderr)
        return 1
    finally:
        if created:
            assert name.startswith('week3_benchmark_')
            client.drop_database(name)
        if client is not None:
            client.close()
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
