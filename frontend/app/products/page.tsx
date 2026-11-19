'use client';

import React, { useState, useEffect } from 'react';
import { getProducts, Product, Category, Brand } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { Search, Filter, RotateCcw, SlidersHorizontal, Package } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedSocket, setSelectedSocket] = useState('');
  const [selectedRamType, setSelectedRamType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const fetchFilteredProducts = async () => {
    setLoading(true);
    try {
      const res = await getProducts({
        q: searchQuery,
        category_id: selectedCategory,
        brand_id: selectedBrand,
        socket: selectedSocket,
        ram_type: selectedRamType,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
      });
      setProducts(res.items || []);
      if (res.categories && res.categories.length > 0) setCategories(res.categories);
      if (res.brands && res.brands.length > 0) setBrands(res.brands);
    } catch (err) {
      console.error('Lỗi khi tải linh kiện:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredProducts();
  }, [selectedCategory, selectedBrand, selectedSocket, selectedRamType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilteredProducts();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedSocket('');
    setSelectedRamType('');
    setMinPrice('');
    setMaxPrice('');
    setTimeout(fetchFilteredProducts, 50);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Package className="w-8 h-8 text-sky-400" />
            <span>Kho Linh Kiện PC</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Lọc đa hình theo thuộc tính kỹ thuật động (Dynamic Specs) sử dụng MongoDB Wildcard Index
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên linh kiện..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="space-y-6 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl h-fit">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <SlidersHorizontal className="w-4 h-4 text-sky-400" />
              <span>Bộ Lọc Thông Số</span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại</span>
            </button>
          </div>

          {/* Danh mục */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Danh mục linh kiện</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Thương hiệu */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Thương hiệu</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Tất cả thương hiệu</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Spec: Socket CPU & Mainboard */}
          <div>
            <label className="text-xs font-semibold text-emerald-400 block mb-2">
              • Socket (CPU & Mainboard)
            </label>
            <select
              value={selectedSocket}
              onChange={(e) => setSelectedSocket(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Tất cả socket</option>
              <option value="LGA 1700">Intel LGA 1700 (Gen 12)</option>
              <option value="AM4">AMD Socket AM4 (Ryzen 5000)</option>
            </select>
          </div>

          {/* Dynamic Spec: Chuẩn RAM */}
          <div>
            <label className="text-xs font-semibold text-sky-400 block mb-2">
              • Chuẩn RAM (DDR4 / DDR5)
            </label>
            <select
              value={selectedRamType}
              onChange={(e) => setSelectedRamType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Tất cả chuẩn RAM</option>
              <option value="DDR4">DDR4</option>
              <option value="DDR5">DDR5</option>
            </select>
          </div>

          {/* Khoảng giá */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Khoảng giá (VND)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Từ..."
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <input
                type="number"
                placeholder="Đến..."
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <button
              onClick={fetchFilteredProducts}
              className="w-full mt-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
            >
              Áp dụng giá
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tìm thấy <strong className="text-white">{products.length}</strong> linh kiện</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-72 rounded-xl bg-slate-900 animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-white font-semibold">Không tìm thấy linh kiện nào</p>
              <p className="text-xs text-slate-400 mt-1">Hãy thử xóa bộ lọc hoặc tìm kiếm từ khóa khác</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <ProductCard
                  key={p.sku}
                  product={p}
                  onAddToCart={(prod) => alert(`Đã thêm ${prod.name} vào giỏ hàng!`)}
                  onSelectForBuild={(prod) => (window.location.href = `/pc-builder?add_${prod.category.id}=${prod.sku}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
