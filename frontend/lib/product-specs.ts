export type SpecField = { key: string; label: string; type?: 'number' | 'boolean' | 'list'; unit?: string; options?: string[] };
const socket: SpecField = { key: 'socket', label: 'Socket', options: ['AM4', 'AM5', 'LGA1700', 'LGA1851', 'LGA1200'] };
const ram: SpecField = { key: 'ram_type', label: 'Chuẩn RAM', options: ['DDR4', 'DDR5', 'DDR3'] };
const tdp: SpecField = { key: 'tdp_watt', label: 'Công suất tiêu thụ', type: 'number', unit: 'W' };
const capacity: SpecField = { key: 'capacity_gb', label: 'Dung lượng', type: 'number', unit: 'GB' };
const form: SpecField = { key: 'form_factor', label: 'Kích thước / chuẩn', options: ['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX'] };
export const SPEC_FIELDS: Record<string, SpecField[]> = {
  LSP01: [socket, {key:'cores',label:'Số nhân',type:'number'}, {key:'threads',label:'Số luồng',type:'number'}, {key:'base_clock_ghz',label:'Xung cơ bản',type:'number',unit:'GHz'}, {key:'boost_clock_ghz',label:'Xung tối đa',type:'number',unit:'GHz'}, tdp, {key:'integrated_gpu',label:'Có đồ họa tích hợp',type:'boolean'}],
  LSP02: [socket, ram, {key:'chipset',label:'Chipset'}, form, {key:'ram_slots',label:'Số khe RAM',type:'number'}, {key:'max_ram_gb',label:'RAM tối đa',type:'number',unit:'GB'}],
  LSP03: [ram, capacity, {key:'bus_speed_mhz',label:'Bus RAM',type:'number',unit:'MHz'}, {key:'modules',label:'Số thanh',type:'number'}, {key:'rgb',label:'Có RGB',type:'boolean'}],
  LSP04: [capacity, {key:'storage_type',label:'Loại ổ đĩa',options:['SSD','HDD']}, {key:'interface',label:'Giao tiếp',options:['NVMe PCIe 4.0','NVMe PCIe 3.0','SATA III']}, {key:'form_factor',label:'Kích thước ổ đĩa',options:['M.2 2280','2.5 inch','3.5 inch']}, {key:'read_speed_mbps',label:'Tốc độ đọc',type:'number',unit:'MB/s'}, {key:'write_speed_mbps',label:'Tốc độ ghi',type:'number',unit:'MB/s'}],
  LSP05: [{key:'gpu_chipset',label:'Chip đồ họa'}, {key:'vram_gb',label:'Bộ nhớ VRAM',type:'number',unit:'GB'}, {key:'vram_type',label:'Loại VRAM',options:['GDDR6','GDDR6X','GDDR7']}, tdp, {key:'recommended_psu_watt',label:'Nguồn khuyến nghị',type:'number',unit:'W'}, {key:'length_mm',label:'Chiều dài card',type:'number',unit:'mm'}],
  LSP06: [{key:'wattage',label:'Công suất nguồn',type:'number',unit:'W'}, {key:'efficiency_rating',label:'Chứng nhận hiệu suất',options:['80+ Bronze','80+ Gold','80+ Platinum','80+ Titanium']}, {key:'modular',label:'Kiểu dây nguồn',options:['Full Modular','Semi Modular','Non Modular']}, {key:'fan_size_mm',label:'Quạt nguồn',type:'number',unit:'mm'}],
  LSP07: [{key:'case_size',label:'Loại case',options:['Mid Tower','Full Tower','Mini Tower']}, {key:'supported_motherboards',label:'Mainboard hỗ trợ',type:'list'}, {key:'max_gpu_length_mm',label:'Chiều dài VGA tối đa',type:'number',unit:'mm'}, {key:'max_cpu_cooler_height_mm',label:'Chiều cao tản tối đa',type:'number',unit:'mm'}, {key:'included_fans',label:'Quạt đi kèm',type:'number'}],
  LSP08: [{key:'cooler_type',label:'Loại tản nhiệt',options:['Air','AIO Liquid']}, {key:'supported_sockets',label:'Socket hỗ trợ',type:'list'}, {key:'max_tdp_cooling_watt',label:'Khả năng tản nhiệt',type:'number',unit:'W'}, {key:'height_mm',label:'Chiều cao tản khí',type:'number',unit:'mm'}, {key:'radiator_size_mm',label:'Kích thước radiator',type:'number',unit:'mm'}, {key:'rgb',label:'Có RGB',type:'boolean'}],
  LSP09: [{key:'screen_size_inch',label:'Kích thước màn hình',type:'number',unit:'inch'}, {key:'resolution',label:'Độ phân giải'}, {key:'panel_type',label:'Tấm nền',options:['IPS','VA','TN','OLED']}, {key:'refresh_rate_hz',label:'Tần số quét',type:'number',unit:'Hz'}, {key:'response_time_ms',label:'Thời gian phản hồi',type:'number',unit:'ms'}],
};
export function specLabel(category: string, key: string) {
  const field = SPEC_FIELDS[category]?.find(f => f.key === key);
  return field ? field.label + (field.unit ? ` (${field.unit})` : '') : key.replaceAll('_', ' ');
}
export function specValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (Array.isArray(value)) return value.map(specValue).join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value ?? '—');
}
