'use client';

import React, { useState, useEffect } from 'react';
import { getOrders, Order } from '@/lib/api';
import { Package, Clock, CheckCircle2, XCircle, Truck, MapPin, Calendar } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrdersData = async (status?: string) => {
    setLoading(true);
    try {
      const data = await getOrders({ status: status || undefined });
      setOrders(data || []);
    } catch (err) {
      console.error('Không thể tải đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersData(statusFilter);
  }, [statusFilter]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Chưa cập nhật';
    try {
      return new Date(isoString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Đã giao':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Đã giao
          </span>
        );
      case 'Đang giao':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-950 text-sky-400 border border-sky-800 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Đang giao
          </span>
        );
      case 'Đã hủy':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Đã hủy
          </span>
        );
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Package className="w-8 h-8 text-sky-400" />
            <span>Lịch Sử Đơn Đặt Hàng</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Minh họa <strong>Snapshot Pattern</strong>: Chi tiết sản phẩm và đơn giá được lưu cố định tại thời điểm mua
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          {[
            { label: 'Tất cả', val: '' },
            { label: 'Đang giao', val: 'Đang giao' },
            { label: 'Đã giao', val: 'Đã giao' },
            { label: 'Đã hủy', val: 'Đã hủy' },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setStatusFilter(tab.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === tab.val
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-900 rounded-2xl animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-white font-semibold">Chưa có đơn hàng nào</p>
          <p className="text-xs text-slate-400 mt-1">Các đơn hàng được tạo sẽ hiển thị snapshot chi tiết tại đây</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.order_code}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all shadow-xl"
            >
              {/* Order Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sky-400 font-mono font-bold text-xs">
                    {order.order_code.substring(0, 4)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-white text-base">{order.order_code}</span>
                      <span className="text-xs text-slate-400">({order.customer_email})</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(order.dates?.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {getStatusBadge(order.status)}
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      order.payment_status === 'Đã thanh toán'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                        : 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                    }`}
                  >
                    {order.payment_status}
                  </span>
                </div>
              </div>

              {/* Items Snapshot Table */}
              <div className="py-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Linh Kiện Đã Đặt (Snapshot Items)
                </h4>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-500 font-semibold">{item.sku}</span>
                        <span className="text-slate-200 font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-slate-400">Số lượng: <strong>{item.quantity}</strong></span>
                        <span className="font-mono font-bold text-sky-400">{formatPrice(item.unit_price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Card Footer */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-start space-x-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Giao tới: <strong className="text-white">{order.shipping_address?.full_name}</strong> -{' '}
                    {order.shipping_address?.phone} ({order.shipping_address?.street},{' '}
                    {order.shipping_address?.ward}, {order.shipping_address?.district},{' '}
                    {order.shipping_address?.province})
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 mr-2">Tổng tiền:</span>
                  <span className="text-lg font-bold text-white font-mono">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
