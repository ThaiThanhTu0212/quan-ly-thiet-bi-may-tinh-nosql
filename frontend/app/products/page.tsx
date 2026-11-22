import ProductCatalog from '@/components/ProductCatalog';

export default function ProductsPage({ searchParams }: { searchParams: { category_id?: string | string[] } }) {
  const category = typeof searchParams.category_id === 'string' ? searchParams.category_id : '';
  return <ProductCatalog key={category} initialCategory={category} />;
}
