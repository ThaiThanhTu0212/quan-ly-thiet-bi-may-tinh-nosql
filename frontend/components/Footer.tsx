import React from 'react';
import { Database, ShieldCheck, Cpu } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 mt-20 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 text-white font-bold text-lg mb-3">
              <Cpu className="w-5 h-5 text-sky-400" />
              <span>PC Builder E-Commerce</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Đồ án môn Cơ sở dữ liệu Phi quan hệ (NoSQL - MongoDB). Ứng dụng mô hình Schema đa hình (Polymorphic),
              Wildcard Index và Snapshot Pattern tối ưu hóa hiệu năng so với hệ thống RDBMS cũ.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Kiến trúc NoSQL MongoDB</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>• Polymorphic specs & Wildcard Index (<code className="text-sky-300">specs.$**</code>)</li>
              <li>• Snapshot Pattern trong đơn hàng (<code className="text-sky-300">orders.items</code>)</li>
              <li>• Document Embedding cho địa giới hành chính (<code className="text-sky-300">locations</code>)</li>
              <li>• Aggregation Pipelines cho Dashboard báo cáo thống kê</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Phân chia nhiệm vụ nhóm 2 người</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-300">Thành viên 1:</strong> Sản phẩm, Dynamic Specs Filter, Engine kiểm tra tương thích PC Builder.<br/>
              <strong className="text-slate-300">Thành viên 2:</strong> Auth, Giỏ hàng, Đặt hàng trừ tồn kho, Admin Dashboard Aggregation Pipeline.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-900 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 Đồ án Cơ sở dữ liệu Phi quan hệ - Nhóm 2 người.</p>
          <p className="mt-2 md:mt-0 font-mono">FastAPI (Python) + MongoDB + Next.js 14</p>
        </div>
      </div>
    </footer>
  );
}
