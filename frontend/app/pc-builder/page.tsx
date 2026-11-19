'use client';

import React, { useState, useEffect } from 'react';
import {
  getProducts,
  checkPCCompatibility,
  savePCBuild,
  Product,
  CompatibilityResponse
} from '@/lib/api';
import CompatibilityBanner from '@/components/CompatibilityBanner';
import {
  Cpu,
  Layers,
  HardDrive,
  Zap,
  Box,
  Fan,
  Monitor,
  Plus,
  Trash2,
  Wrench,
  Check,
  ShoppingCart,
  BookmarkPlus
} from 'lucide-react';

interface ComponentSlot {
  key: string;
  categoryId: string;
  label: string;
  icon: any;
  product: Product | null;
}

export default function PCBuilderPage() {
  const [slots, setSlots] = useState<ComponentSlot[]>([
    { key: 'cpu', categoryId: 'LSP01', label: '1. Vi Xử Lý (CPU)', icon: Cpu, product: null },
    { key: 'mainboard', categoryId: 'LSP02', label: '2. Bo Mạch Chủ (Mainboard)', icon: Layers, product: null },
    { key: 'ram', categoryId: 'LSP03', label: '3. Bộ Nhớ Trong (RAM)', icon: Zap, product: null },
    { key: 'gpu', categoryId: 'LSP05', label: '4. Card Màn Hình (GPU)', icon: Monitor, product: null },
    { key: 'storage', categoryId: 'LSP04', label: '5. Ổ Cứng (SSD/HDD)', icon: HardDrive, product: null },
    { key: 'psu', categoryId: 'LSP06', label: '6. Nguồn Máy Tính (PSU)', icon: Zap, product: null },
    { key: 'case', categoryId: 'LSP07', label: '7. Vỏ Máy Tính (Case)', icon: Box, product: null },
    { key: 'cooler', categoryId: 'LSP08', label: '8. Tản Nhiệt CPU', icon: Fan, product: null },
  ]);

  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [modalSlot, setModalSlot] = useState<ComponentSlot | null>(null);
  const [compatibility, setCompatibility] = useState<CompatibilityResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [buildTitle, setBuildTitle] = useState('Dàn PC Tự Build Mới');

  // Load all products to select
  useEffect(() => {
    async function loadAllProducts() {
      try {
        const res = await getProducts({ limit: 100 });
        setAvailableProducts(res.items || []);
      } catch (err) {
        console.error('Không thể tải linh kiện:', err);
      }
    }
    loadAllProducts();
  }, []);

  // Check compatibility whenever slots change
  useEffect(() => {
    const getSku = (key: string) => slots.find((s) => s.key === key)?.product?.sku;

    const payload = {
      cpu_sku: getSku('cpu'),
      mainboard_sku: getSku('mainboard'),
      ram_sku: getSku('ram'),
      gpu_sku: getSku('gpu'),
      psu_sku: getSku('psu'),
      storage_sku: getSku('storage'),
      case_sku: getSku('case'),
      cooler_sku: getSku('cooler'),
    };

    const hasAnyComponent = Object.values(payload).some(Boolean);
    if (!hasAnyComponent) {
      setCompatibility(null);
      return;
    }

    setChecking(true);
    checkPCCompatibility(payload)
      .then((res) => setCompatibility(res))
      .catch((err) => console.error('Lỗi kiểm tra tương thích:', err))
      .finally(() => setChecking(false));
  }, [slots]);

  const handleSelectProduct = (slotKey: string, product: Product) => {
    setSlots((prev) =>
      prev.map((s) => (s.key === slotKey ? { ...s, product } : s))
    );
    setModalSlot(null);
  };

  const handleRemoveProduct = (slotKey: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.key === slotKey ? { ...s, product: null } : s))
    );
  };

  const handleSaveBuild = async () => {
    if (!compatibility) {
      alert('Vui lòng chọn ít nhất 1 linh kiện để lưu cấu hình!');
      return;
    }

    const componentsSnapshot: Record<string, any> = {};
    slots.forEach((s) => {
      if (s.product) {
        componentsSnapshot[s.key] = {
          sku: s.product.sku,
          name: s.product.name,
          price: s.product.price,
          specs: s.product.specs,
        };
      }
    });

    try {
      await savePCBuild({
        title: buildTitle,
        components: componentsSnapshot,
        total_price: compatibility.total_price,
        estimated_wattage: compatibility.estimated_wattage,
        is_compatible: compatibility.is_compatible,
        notes: compatibility.is_compatible ? 'Đã kiểm tra tương thích thành công' : 'Có cảnh báo xung đột',
      });
      alert('Đã lưu cấu hình PC vào MongoDB thành công!');
    } catch (err: any) {
      alert(`Lỗi khi lưu cấu hình: ${err.message}`);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const totalPrice = slots.reduce((acc, s) => acc + (s.product?.price || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Công cụ độc quyền
            </span>
            <span className="text-xs text-slate-400 font-mono">NoSQL Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1 flex items-center gap-2">
            <Wrench className="w-8 h-8 text-emerald-400" />
            <span>Xây Dựng Cấu Hình PC & Kiểm Tra Tương Thích</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Tự động kiểm tra Socket CPU - Mainboard, Chuẩn RAM DDR4/DDR5 và Công suất nguồn PSU real-time
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveBuild}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium border border-slate-700 transition-colors text-sm"
          >
            <BookmarkPlus className="w-4 h-4 text-sky-400" />
            <span>Lưu cấu hình</span>
          </button>
          <button
            onClick={() => alert('Đã thêm các linh kiện hợp lệ vào giỏ hàng!')}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Thêm vào giỏ</span>
          </button>
        </div>
      </div>

      {/* Compatibility Banner */}
      <CompatibilityBanner data={compatibility} loading={checking} />

      {/* Main Slots Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={buildTitle}
              onChange={(e) => setBuildTitle(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 mr-2">Tổng chi phí dự kiến:</span>
            <span className="text-xl font-bold text-sky-400 font-mono">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-800">
          {slots.map((slot) => {
            const Icon = slot.icon;
            const p = slot.product;

            return (
              <div
                key={slot.key}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
              >
                {/* Slot info */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                    <Icon className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{slot.label}</h3>
                    {p ? (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-sm font-medium text-emerald-400">{p.name}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                          <span className="font-mono text-slate-500">{p.sku}</span>
                          {p.specs?.socket && <span>• Socket: {p.specs.socket}</span>}
                          {p.specs?.ram_type && <span>• RAM: {p.specs.ram_type}</span>}
                          {p.specs?.tdp_watt && <span>• TDP: {p.specs.tdp_watt}W</span>}
                          {p.specs?.wattage && <span>• Công suất: {p.specs.wattage}W</span>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic mt-0.5">Chưa chọn linh kiện cho vị trí này</p>
                    )}
                  </div>
                </div>

                {/* Pricing & Slot Actions */}
                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  {p && (
                    <div className="text-right">
                      <div className="text-base font-bold text-white font-mono">{formatPrice(p.price)}</div>
                    </div>
                  )}

                  {p ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setModalSlot(slot)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
                      >
                        Đổi
                      </button>
                      <button
                        onClick={() => handleRemoveProduct(slot.key)}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        title="Xóa linh kiện này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setModalSlot(slot)}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-all hover:scale-105"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Chọn linh kiện</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Chọn Linh Kiện Cho Từng Slot */}
      {modalSlot && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Chọn linh kiện cho {modalSlot.label}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Danh sách các sản phẩm có sẵn trong cơ sở dữ liệu</p>
              </div>
              <button
                onClick={() => setModalSlot(null)}
                className="text-slate-400 hover:text-white text-sm p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Product List */}
            <div className="p-4 overflow-y-auto divide-y divide-slate-800 flex-1 space-y-2">
              {availableProducts
                .filter((p) => p.category.id === modalSlot.categoryId)
                .map((product) => (
                  <div
                    key={product.sku}
                    className="pt-3 pb-3 flex items-center justify-between gap-4 hover:bg-slate-800/60 p-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-14 h-14 bg-slate-950 rounded-lg p-1.5 flex items-center justify-center shrink-0 border border-slate-800">
                        <img
                          src={product.images[0] || '/images/background_login.jpg'}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">{product.name}</h4>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-400 mt-1">
                          <span className="font-mono text-sky-400 font-semibold">{product.brand.name}</span>
                          {product.specs?.socket && <span>• Socket: {product.specs.socket}</span>}
                          {product.specs?.ram_type && <span>• RAM: {product.specs.ram_type}</span>}
                          {product.specs?.tdp_watt && <span>• TDP: {product.specs.tdp_watt}W</span>}
                          {product.specs?.wattage && <span>• Công suất: {product.specs.wattage}W</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-bold text-white font-mono">
                          {formatPrice(product.price)}
                        </span>
                        <div className="text-[10px] text-emerald-400">Còn {product.stock} trong kho</div>
                      </div>
                      <button
                        onClick={() => handleSelectProduct(modalSlot.key, product)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Chọn</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
