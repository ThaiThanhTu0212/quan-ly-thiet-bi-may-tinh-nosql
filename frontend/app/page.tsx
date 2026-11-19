'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cpu, Wrench, Shield, Database, Sparkles, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { getProducts, Product } from '@/lib/api';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getProducts({ limit: 8 });
        setFeaturedProducts(res.items || []);
      } catch (err) {
        console.error('Không thể tải sản phẩm trang chủ:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 pt-12 pb-20 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Đồ án Cơ sở dữ liệu Phi quan hệ (NoSQL - MongoDB)</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Website Bán Linh Kiện &{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-teal-300 to-indigo-400">
                Build PC Tương Thích
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Kiến trúc Monorepo hiệu năng cao kết hợp <strong>Python FastAPI</strong> và <strong>Next.js 14</strong>.
              Áp dụng mô hình Schema đa hình, Wildcard Indexing và Snapshot Pattern loại bỏ hoàn toàn các phép JOIN quan hệ phức tạp.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Link
                href="/pc-builder"
                className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform"
              >
                <Wrench className="w-5 h-5" />
                <span>Bắt đầu Build PC ngay</span>
              </Link>
              <Link
                href="/products"
                className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold border border-slate-700 transition-colors"
              >
                <span>Xem kho linh kiện</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Trụ Cột Kiến Trúc NoSQL (So sánh với SQL) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Ưu thế Kiến trúc NoSQL MongoDB</h2>
          <p className="text-sm text-slate-400 mt-2">
            Giải quyết triệt để các hạn chế của mô hình RDBMS trong quản lý thông số linh kiện máy tính
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl hover:border-sky-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4 border border-sky-500/20">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-2">Polymorphic Specs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mỗi linh kiện (CPU, RAM, GPU) có thông số kỹ thuật đa dạng lồng trong BSON Object thay vì cột chuỗi text thô.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl hover:border-emerald-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-2">Wildcard Indexing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Đánh chỉ mục <code className="text-emerald-400 font-mono">specs.$**</code> cho phép lọc mọi thuộc tính động (socket, ram_type) tốc độ cao.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl hover:border-indigo-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-2">Snapshot Pattern</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Chi tiết đơn hàng lưu snapshot giá và tên sản phẩm lúc mua. Không bị sai lệch lịch sử khi sản phẩm đổi giá.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl hover:border-purple-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/20">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-2">Hierarchical Embedding</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gom gọn 3 bảng quan hệ (Tỉnh - Huyện - Xã) thành 1 collection <code className="text-purple-400 font-mono">locations</code> lồng nhau.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Linh kiện PC Nổi bật</h2>
            <p className="text-xs text-slate-400 mt-1">Dữ liệu thực tế 25 linh kiện sẵn sàng build máy</p>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-sky-400 hover:text-sky-300 flex items-center space-x-1"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-72 rounded-xl bg-slate-900 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.sku}
                product={product}
                onAddToCart={(p) => alert(`Đã thêm ${p.name} vào giỏ hàng!`)}
                onSelectForBuild={(p) => (window.location.href = `/pc-builder?add_${p.category.id}=${p.sku}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
