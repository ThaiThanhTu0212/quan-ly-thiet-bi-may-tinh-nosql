'use client';

import React, { useState, useEffect } from 'react';
import {
  getAnalyticsOverview,
  getRevenueByStatus,
  getTopSellingProducts,
  getLowStockAlert,
  Product
} from '@/lib/api';
import {
  DollarSign,
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  LayoutDashboard,
  CheckCircle,
  Clock,
  XCircle,
  Flame
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [revenueStatus, setRevenueStatus] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [ov, rev, top, low] = await Promise.all([
          getAnalyticsOverview(),
          getRevenueByStatus(),
          getTopSellingProducts(),
          getLowStockAlert(),
        ]);
        setOverview(ov);
        setRevenueStatus(rev);
        setTopProducts(top);
        setLowStockProducts(low);
      } catch (err) {
        console.error('Lỗi tải dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              Admin Control Panel
            </span>
            <span className="text-xs text-slate-400 font-mono">Aggregation Pipelines</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1 flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-indigo-400" />
            <span>Trung Tâm Báo Cáo & Thống Kê NoSQL</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Dữ liệu tổng hợp từ các toán tử MongoDB Aggregation: <code className="text-sky-300">$match</code>,{' '}
            <code className="text-sky-300">$unwind</code>, <code className="text-sky-300">$group</code>,{' '}
            <code className="text-sky-300">$sort</code>
          </p>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng Doanh Thu</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {overview ? formatPrice(overview.total_revenue) : '...'}
          </div>
          <span className="text-xs text-emerald-400 mt-1 block">Từ các đơn hàng thành công</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng Đơn Hàng</span>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {overview ? overview.total_orders : '...'}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Toàn bộ đơn phát sinh</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng Linh Kiện</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">
            {overview ? overview.total_products : '...'}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">SKU trong catalog</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cảnh Báo Tồn Kho</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">
            {overview ? overview.low_stock_count : '...'}
          </div>
          <span className="text-xs text-amber-400/80 mt-1 block">Tồn kho ≤ Ngưỡng an toàn</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Doanh thu theo trạng thái */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <TrendingUp className="w-5 h-5 text-sky-400" />
            <h2 className="font-bold text-white text-base">Phân Bổ Đơn Hàng Theo Trạng Thái ($group)</h2>
          </div>

          <div className="space-y-3">
            {revenueStatus.map((item) => (
              <div
                key={item.status}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  {item.status === 'Đã giao' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : item.status === 'Đang giao' ? (
                    <Clock className="w-5 h-5 text-sky-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <div>
                    <h3 className="font-bold text-white text-sm">{item.status}</h3>
                    <p className="text-xs text-slate-400">Số lượng: {item.count} đơn</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-sky-400 font-mono">
                    {formatPrice(item.total_amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 sản phẩm bán chạy nhất */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Flame className="w-5 h-5 text-rose-400" />
            <h2 className="font-bold text-white text-base">Top Linh Kiện Bán Chạy ($unwind + $group)</h2>
          </div>

          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có thống kê lượt bán</p>
            ) : (
              topProducts.map((p, idx) => (
                <div
                  key={p.sku}
                  className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-sky-400 font-bold text-xs flex items-center justify-center font-mono">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-white text-xs">{p.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{p.sku}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-400">
                      Đã bán: {p.total_quantity_sold} cái
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{formatPrice(p.total_revenue)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bảng Cảnh Báo Tồn Kho (Low Stock Alert) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-white text-base">
            Danh Sách Linh Kiện Cần Nhập Kho Gấp (<code className="text-xs font-mono text-amber-300">stock ≤ min_stock_alert</code>)
          </h2>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="text-center py-8 text-emerald-400 text-xs">
            <CheckCircle className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
            <span>Tất cả linh kiện đều có mức tồn kho an toàn!</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Mã SKU</th>
                  <th className="p-3">Tên Linh Kiện</th>
                  <th className="p-3">Danh Mục</th>
                  <th className="p-3">Thương Hiệu</th>
                  <th className="p-3">Tồn Kho Hiện Tại</th>
                  <th className="p-3">Ngưỡng Báo Động</th>
                  <th className="p-3">Tình Trạng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {lowStockProducts.map((prod) => (
                  <tr key={prod.sku} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-sky-400">{prod.sku}</td>
                    <td className="p-3 font-medium text-white">{prod.name}</td>
                    <td className="p-3">{prod.category?.name}</td>
                    <td className="p-3">{prod.brand?.name}</td>
                    <td className="p-3 font-mono font-bold text-amber-400">{prod.stock}</td>
                    <td className="p-3 font-mono text-slate-400">{prod.min_stock_alert}</td>
                    <td className="p-3">
                      {prod.stock === 0 ? (
                        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 font-semibold">
                          Hết hàng
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 font-semibold">
                          Sắp hết
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
