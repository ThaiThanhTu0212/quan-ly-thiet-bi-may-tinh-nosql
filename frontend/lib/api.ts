const API_BASE_URL = '/backend-api';

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
  spec_options: Record<string, (string | number)[]>;
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'customer';
}

export interface SavedAddress extends ShippingAddress { id: string; label: string }
export interface AccountProfile { id: string; username: string; email: string; full_name: string; phone: string; addresses: SavedAddress[]; default_address_id: string | null }
export type AddressWrite = ShippingAddress & { label: string; set_default: boolean };
export function getAccount(signal?: AbortSignal) { return apiRequest<AccountProfile>('/account', { signal }); }
export function saveProfile(full_name: string, phone: string) {
  return apiRequest<AccountProfile>('/account', { method: 'PATCH', body: JSON.stringify({ full_name, phone }) });
}
export function saveAddress(address: AddressWrite, id?: string) {
  return apiRequest<AccountProfile>('/account/addresses' + (id ? '/'+encodeURIComponent(id) : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify(address) });
}
export function deleteAddress(id: string) { return apiRequest<AccountProfile>('/account/addresses/'+encodeURIComponent(id), { method: 'DELETE' }); }
export function setDefaultAddress(id: string) { return apiRequest<AccountProfile>('/account/addresses/'+encodeURIComponent(id)+'/default', { method: 'POST' }); }
export function cancelOrder(code: string) { return apiRequest<{order_code:string;status:string}>('/orders/'+encodeURIComponent(code)+'/cancel', { method: 'POST' }); }
export function getMyOrders(params: {status?: string;skip?: number;limit?: number}, signal?: AbortSignal) {
  const query = new URLSearchParams(); Object.entries(params).forEach(([key,value])=>{if(value!==undefined&&value!=='')query.set(key,String(value));});
  return apiRequest<Order[]>('/account/orders?'+query,{signal});
}
export function getComparison(skus: string[], signal?: AbortSignal) {
  const query = new URLSearchParams(); skus.forEach(sku=>query.append('skus',sku));
  return apiRequest<Product[]>('/products/compare?'+query, { signal });
}

export async function authRequest<T>(path: string, body?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/auth/${path}`, {
    cache: 'no-store',
    ...(body && {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (typeof data.detail === 'string') throw new Error(data.detail);
    const messages: Record<string, string> = {
      email: 'Email không hợp lệ.',
      full_name: 'Vui lòng kiểm tra họ và tên.',
      username: 'Vui lòng kiểm tra tên đăng nhập.',
      password: 'Vui lòng kiểm tra độ dài mật khẩu.',
    };
    const field = Array.isArray(data.detail) ? data.detail[0]?.loc?.[1] : undefined;
    throw new Error(messages[field] || 'Vui lòng kiểm tra thông tin đã nhập.');
  }
  return data;
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
  status: 'Chờ xác nhận' | 'Đang giao' | 'Đã giao' | 'Đã hủy';
  payment_status: 'Đã thanh toán' | 'Chưa thanh toán';
  payment_method?: string;
  dates: {
    created_at: string;
    paid_at?: string | null;
    estimated_delivery?: string | null;
  };
}

// API functions
export async function getProducts(params?: Record<string, string | number | undefined>, signal?: AbortSignal): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
  }
  const res = await fetch(`${API_BASE_URL}/products?${query.toString()}`, { cache: 'no-store', signal });
  if (!res.ok) throw new Error('Không thể tải danh sách sản phẩm');
  return res.json();
}

export async function getProductBySku(sku: string, signal?: AbortSignal): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(sku)}`, { cache: 'no-store', signal });
  if (!res.ok) throw new Error(`Không tìm thấy linh kiện: ${sku}`);
  return res.json();
}

export async function getBestSellers(signal?: AbortSignal): Promise<Product[]> {
  const res = await fetch(`${API_BASE_URL}/products/best-sellers`, { cache: 'no-store', signal });
  if (!res.ok) throw new Error('Không thể tải sản phẩm bán chạy');
  return res.json();
}

export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
  const res = await fetch(`${API_BASE_URL}/products/categories/list`, { cache: 'no-store', signal });
  if (!res.ok) throw new Error('Không thể tải danh mục');
  return res.json();
}

export interface Selection {
  cpu_sku?: string; mainboard_sku?: string; ram_sku?: string; gpu_sku?: string;
  psu_sku?: string; storage_sku?: string; case_sku?: string; cooler_sku?: string;
}

export interface CartEntry { sku: string; quantity: number; product: Product | null }
export interface Cart { items: CartEntry[]; total_amount: number }
export interface SavedBuild {
  build_code: string; title: string; notes: string; components: Record<string, Product>;
  total_price: number; estimated_wattage: number; is_compatible: boolean;
}
export interface Ward { ward_id: string; ward_name: string }
export interface District { district_id: string; district_name: string; wards: Ward[] }
export interface Province { province_id: string; province_name: string; districts: District[] }
export interface CheckoutRequest {
  request_id: string; shipping_address: ShippingAddress;
  items: { sku: string; quantity: number }[]; payment_method: 'COD' | 'Chuyển khoản';
  expected_total: number;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(API_BASE_URL + path, { cache: 'no-store', ...options,
    headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.detail === 'string' ? data.detail
      : response.status === 401 ? 'Vui lòng đăng nhập để tiếp tục.'
      : response.status === 422 ? 'Vui lòng kiểm tra thông tin đã nhập.' : 'Không thể gửi yêu cầu. Vui lòng thử lại.';
    throw new ApiError(message, response.status);
  }
  return data;
}

export function checkPCCompatibility(selection: Selection, signal?: AbortSignal) {
  return apiRequest<CompatibilityResponse>('/builder/check-compatibility',
    { method: 'POST', body: JSON.stringify(selection), signal });
}
export interface BuildRecommendation {
  sku: string;
  status: 'compatible' | 'warning' | 'unknown' | 'incompatible' | 'out_of_stock';
  reasons: string[];
}
export function getBuildRecommendations(selection: Selection, signal?: AbortSignal) {
  return apiRequest<{ slots: Record<string, BuildRecommendation[]> }>('/builder/recommendations',
    { method: 'POST', body: JSON.stringify(selection), signal });
}
export function savePCBuild(build: { title: string; components: Record<string, string>; notes?: string }) {
  return apiRequest<SavedBuild>('/builder/share', { method: 'POST', body: JSON.stringify(build) });
}
export function getSharedBuild(code: string, signal?: AbortSignal) {
  return apiRequest<SavedBuild>('/builder/share/' + encodeURIComponent(code), { signal });
}
export function getCart(signal?: AbortSignal) { return apiRequest<Cart>('/cart', { signal }); }
export function addCartItems(items: { sku: string; quantity: number }[]) {
  return apiRequest<Cart>('/cart/items', { method: 'POST', body: JSON.stringify({ items }) });
}
export function setCartQuantity(sku: string, quantity: number) {
  return apiRequest<Cart>('/cart/items/' + encodeURIComponent(sku),
    { method: 'PUT', body: JSON.stringify({ sku, quantity }) });
}
export function removeCartItem(sku: string) {
  return apiRequest<Cart>('/cart/items/' + encodeURIComponent(sku), { method: 'DELETE' });
}
export function clearCart() { return apiRequest<Cart>('/cart', { method: 'DELETE' }); }
export function createOrder(order: CheckoutRequest) {
  return apiRequest<Order>('/orders', { method: 'POST', body: JSON.stringify(order) });
}
export function getOrders(params?: { customer_email?: string; status?: string; skip?: number; limit?: number }, signal?: AbortSignal) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  return apiRequest<Order[]>('/orders?' + query, { signal });
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

export function getLocations(signal?: AbortSignal) {
  return apiRequest<Province[]>('/locations', { signal });
}
