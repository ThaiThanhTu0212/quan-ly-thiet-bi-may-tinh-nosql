'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';
import { createOrder, getLocations, Product, getProducts } from '@/lib/api';

interface CartItemState {
  sku: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export default function CartPage() {
  const router = useRouter();

  // Khởi tạo một vài item mẫu trong giỏ
  const [cartItems, setCartItems] = useState<CartItemState[]>([
    {
      sku: 'SP01',
      name: 'Intel Core i5-12400F',
      price: 4300000,
      quantity: 1,
      image: '/images/CPU_12400F_1.png',
    },
    {
      sku: 'SP08',
      name: 'Kingston Fury Beast 16GB DDR4 3200',
      price: 1100000,
      quantity: 2,
      image: '/images/RAM_FURY_1.jpg',
    },
  ]);

  const [locations, setLocations] = useState<any[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [street, setStreet] = useState('12 Hàng Bạc');
  const [fullName, setFullName] = useState('Nguyễn Văn An');
  const [phone, setPhone] = useState('0912345678');
  const [email, setEmail] = useState('customer@pcbuilder.vn');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadLocations() {
      try {
        const data = await getLocations();
        setLocations(data || []);
        if (data && data.length > 0) {
          setSelectedProvince(data[0].province_name);
          if (data[0].districts && data[0].districts.length > 0) {
            setSelectedDistrict(data[0].districts[0].district_name);
            if (data[0].districts[0].wards && data[0].districts[0].wards.length > 0) {
              setSelectedWard(data[0].districts[0].wards[0].ward_name);
            }
          }
        }
      } catch (err) {
        console.error('Không thể tải địa giới:', err);
      }
    }
    loadLocations();
  }, []);

  const currentProvinceObj = locations.find((l) => l.province_name === selectedProvince);
  const districts = currentProvinceObj?.districts || [];
  const currentDistrictObj = districts.find((d: any) => d.district_name === selectedDistrict);
  const wards = currentDistrictObj?.wards || [];

  const handleProvinceChange = (name: string) => {
    setSelectedProvince(name);
    const p = locations.find((l) => l.province_name === name);
    if (p && p.districts && p.districts.length > 0) {
      setSelectedDistrict(p.districts[0].district_name);
      if (p.districts[0].wards && p.districts[0].wards.length > 0) {
        setSelectedWard(p.districts[0].wards[0].ward_name);
      }
    }
  };

  const handleDistrictChange = (name: string) => {
    setSelectedDistrict(name);
    const d = districts.find((dist: any) => dist.district_name === name);
    if (d && d.wards && d.wards.length > 0) {
      setSelectedWard(d.wards[0].ward_name);
    }
  };

  const updateQuantity = (sku: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.sku === sku) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItemState[]
    );
  };

  const removeItem = (sku: string) => {
    setCartItems((prev) => prev.filter((item) => item.sku !== sku));
  };

  const totalAmount = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert('Giỏ hàng trống!');
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload = {
        customer_email: email,
        shipping_address: {
          full_name: fullName,
          phone: phone,
          street: street,
          ward: selectedWard,
          district: selectedDistrict,
          province: selectedProvince,
        },
        items: cartItems.map((item) => ({
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
        })),
        payment_method: paymentMethod,
      };

      const res = await createOrder(orderPayload);
      alert(`Đặt hàng thành công! Mã đơn: ${res.order_code}`);
      setCartItems([]);
      router.push('/orders');
    } catch (err: any) {
      alert(`Lỗi đặt hàng: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <ShoppingCart className="w-8 h-8 text-sky-400" />
          <span>Giỏ Hàng & Thanh Toán</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Ứng dụng Snapshot Pattern lưu giá cố định tại thời điểm mua và cập nhật trừ kho tồn
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-bold text-white text-lg mb-4">Danh sách linh kiện trong giỏ ({cartItems.length})</h2>

            {cartItems.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p>Giỏ hàng của bạn đang trống</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {cartItems.map((item) => (
                  <div key={item.sku} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-14 h-14 bg-slate-950 rounded-lg p-1 flex items-center justify-center shrink-0 border border-slate-800">
                        <img src={item.image} alt={item.name} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">{item.name}</h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{item.sku}</p>
                        <p className="text-sm font-bold text-sky-400 mt-1">{formatPrice(item.price)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Quantity controls */}
                      <div className="flex items-center space-x-2 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                        <button
                          onClick={() => updateQuantity(item.sku, -1)}
                          className="text-slate-400 hover:text-white px-1.5 font-bold"
                        >
                          -
                        </button>
                        <span className="text-white text-xs font-mono font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.sku, 1)}
                          className="text-slate-400 hover:text-white px-1.5 font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.sku)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Shipping Form & Checkout Summary */}
        <div className="space-y-6">
          <form onSubmit={handleCheckout} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="font-bold text-white text-lg border-b border-slate-800 pb-3">Thông Tin Giao Hàng</h2>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Họ tên người nhận</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Số điện thoại</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            {/* Hierarchical Locations Dropdowns (Tỉnh -> Huyện -> Xã) */}
            <div>
              <label className="text-xs font-medium text-emerald-400 block mb-1">
                Tỉnh / Thành phố (NoSQL Embedding)
              </label>
              <select
                value={selectedProvince}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {locations.map((loc) => (
                  <option key={loc.province_id} value={loc.province_name}>
                    {loc.province_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Quận / Huyện</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {districts.map((d: any) => (
                    <option key={d.district_id} value={d.district_name}>
                      {d.district_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Phường / Xã</label>
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {wards.map((w: any) => (
                    <option key={w.ward_id} value={w.ward_name}>
                      {w.ward_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Địa chỉ chi tiết (Số nhà, tên đường)</label>
              <input
                type="text"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Phương thức thanh toán</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="COD">Thanh toán khi nhận hàng (COD)</option>
                <option value="Chuyển khoản VNPAY">Chuyển khoản VNPAY / QR Code</option>
              </select>
            </div>

            {/* Total and Submit */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Tạm tính:</span>
                <span className="font-mono text-white">{formatPrice(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>Phí vận chuyển:</span>
                <span className="text-emerald-400 font-semibold">Miễn phí</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                <span>Tổng thanh toán:</span>
                <span className="text-sky-400 font-mono text-lg">{formatPrice(totalAmount)}</span>
              </div>

              <button
                type="submit"
                disabled={submitting || cartItems.length === 0}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{submitting ? 'Đang tạo đơn hàng...' : 'Xác nhận đặt hàng'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
