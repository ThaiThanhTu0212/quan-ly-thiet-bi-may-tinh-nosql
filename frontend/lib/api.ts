const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface Category {
  id: string;
  name: string;
  count?: number;
}

export interface Brand {
  id: string;
  name: string;
  count?: number;
}

export interface Product {
  sku: string;
  name: string;
  category: Category;
  brand: Brand;
  price: number;
  stock: number;
  min_stock_alert: number;
  images: string[];
  description: string;
  specs: Record<string, any>;
}

export interface ProductListResponse {
  total: number;
  items: Product[];
  categories: Category[];
  brands: Brand[];
}

export interface CompatibilityMessage {
  type: 'success' | 'warning' | 'error';
  component: string;
  message: string;
}

export interface CompatibilityResponse {
  is_compatible: boolean;
  messages: CompatibilityMessage[];
  estimated_wattage: number;
  recommended_psu_wattage: number;
  total_price: number;
  components: Record<string, Product | null>;
}

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export interface ShippingAddress {
  full_name: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  province: string;
}

export interface Order {
  order_code: string;
  customer_email: string;
  shipping_address: ShippingAddress;
  items: OrderItem[];
  total_amount: number;
  status: 'Đang giao' | 'Đã giao' | 'Đã hủy';
  payment_status: 'Đã thanh toán' | 'Chưa thanh toán';
  payment_method?: string;
  dates: {
    created_at: string;
    paid_at?: string | null;
    estimated_delivery?: string | null;
  };
}

// API functions
export async function getProducts(params?: Record<string, any>): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
  }
  const res = await fetch(`${API_BASE_URL}/products?${query.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không thể tải danh sách sản phẩm');
  return res.json();
}

export async function getProductBySku(sku: string): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/products/${sku}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Không tìm thấy linh kiện: ${sku}`);
  return res.json();
}

export async function checkPCCompatibility(skus: {
  cpu_sku?: string;
  mainboard_sku?: string;
  ram_sku?: string;
  gpu_sku?: string;
  psu_sku?: string;
  storage_sku?: string;
  case_sku?: string;
  cooler_sku?: string;
}): Promise<CompatibilityResponse> {
  const res = await fetch(`${API_BASE_URL}/pc-builder/check-compatibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(skus),
  });
  if (!res.ok) throw new Error('Lỗi khi kiểm tra tính tương thích');
  return res.json();
}

export async function savePCBuild(buildData: any) {
  const res = await fetch(`${API_BASE_URL}/pc-builder/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildData),
  });
  if (!res.ok) throw new Error('Không thể lưu cấu hình PC');
  return res.json();
}

export async function createOrder(orderData: any): Promise<Order> {
  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || 'Không thể tạo đơn hàng');
  }
  return res.json();
}

export async function getOrders(params?: { customer_email?: string; status?: string }): Promise<Order[]> {
  const query = new URLSearchParams();
  if (params?.customer_email) query.append('customer_email', params.customer_email);
  if (params?.status) query.append('status', params.status);
  const res = await fetch(`${API_BASE_URL}/orders?${query.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không thể tải danh sách đơn hàng');
  return res.json();
}

export async function getAnalyticsOverview() {
  const res = await fetch(`${API_BASE_URL}/analytics/overview`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không thể tải tổng quan analytics');
  return res.json();
}

export async function getRevenueByStatus() {
  const res = await fetch(`${API_BASE_URL}/analytics/revenue-by-status`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không thể tải thống kê doanh thu');
  return res.json();
}

export async function getTopSellingProducts() {
  const res = await fetch(`${API_BASE_URL}/analytics/top-selling-products`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không thể tải top sản phẩm');
  return res.json();
}

export async function getLowStockAlert() {
  const res = await fetch(`${API_BASE_URL}/analytics/low-stock-alert`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không thể tải cảnh báo tồn kho');
  return res.json();
}

export async function getLocations() {
  const res = await fetch(`${API_BASE_URL}/locations`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không thể tải danh mục địa giới');
  return res.json();
}
