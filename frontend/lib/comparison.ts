export interface CompareEntry { sku: string; category_id: string }
export function addToComparison(current: CompareEntry[], entry: CompareEntry): { items: CompareEntry[]; error?: string } {
  if (current.some(item=>item.sku===entry.sku)) return {items:current.filter(item=>item.sku!==entry.sku)};
  if (current.length&&current[0].category_id!==entry.category_id) return {items:current,error:'Chỉ so sánh các linh kiện cùng loại. Hãy xóa danh sách hiện tại trước khi đổi loại.'};
  if (current.length>=4) return {items:current,error:'Chỉ có thể so sánh tối đa 4 linh kiện.'};
  return {items:[...current,entry]};
}
