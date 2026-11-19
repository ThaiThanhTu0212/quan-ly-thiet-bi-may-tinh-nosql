'use client';

import React from 'react';
import Image from 'next/image';
import { Product } from '@/lib/api';
import { ShoppingCart, Wrench, CheckCircle, AlertTriangle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onSelectForBuild?: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart, onSelectForBuild }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Lấy ảnh đầu tiên hoặc fallback
  const imageSrc = product.images && product.images.length > 0 ? product.images[0] : '/images/background_login.jpg';

  const isLowStock = product.stock <= product.min_stock_alert && product.stock > 0;
  const isOutOfStock = product.stock === 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all hover:shadow-xl hover:shadow-sky-500/5 flex flex-col group">
      {/* Product Image */}
      <div className="relative h-48 w-full bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
        <img
          src={imageSrc}
          alt={product.name}
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            // Fallback placeholder nếu đường dẫn ảnh bị lỗi
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {product.category?.name || 'Linh kiện'}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
            {product.brand?.name}
          </span>
        </div>

        {/* Stock status badge */}
        <div className="absolute top-2 right-2">
          {isOutOfStock ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 font-medium">
              Hết hàng
            </span>
          ) : isLowStock ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Còn {product.stock}
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Còn hàng
            </span>
          )}
        </div>
      </div>

      {/* Product Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-mono text-slate-500">{product.sku}</span>
          <h3 className="font-semibold text-white text-sm line-clamp-2 mt-0.5 group-hover:text-sky-400 transition-colors">
            {product.name}
          </h3>

          {/* Dynamic Specs highlights */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {product.specs.socket && (
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  Socket: {product.specs.socket}
                </span>
              )}
              {product.specs.ram_type && (
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  RAM: {product.specs.ram_type}
                </span>
              )}
              {product.specs.tdp_watt && (
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  TDP: {product.specs.tdp_watt}W
                </span>
              )}
              {product.specs.vram_gb && (
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  VRAM: {product.specs.vram_gb}GB
                </span>
              )}
              {product.specs.wattage && (
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  Công suất: {product.specs.wattage}W
                </span>
              )}
            </div>
          )}
        </div>

        {/* Pricing & Actions */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-sky-400">
              {formatPrice(product.price)}
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {onSelectForBuild && (
              <button
                onClick={() => onSelectForBuild(product)}
                title="Chọn vào bộ PC Builder"
                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
              >
                <Wrench className="w-4 h-4" />
              </button>
            )}
            {onAddToCart && (
              <button
                disabled={isOutOfStock}
                onClick={() => onAddToCart(product)}
                title="Thêm vào giỏ hàng"
                className={`p-2 rounded-lg transition-colors ${
                  isOutOfStock
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/30'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
