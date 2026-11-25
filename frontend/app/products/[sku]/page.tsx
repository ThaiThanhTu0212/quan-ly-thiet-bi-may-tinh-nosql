import ProductDetails from '@/components/ProductDetails';

export default function ProductDetailsPage({ params }: { params: { sku: string } }) {
  return <ProductDetails key={params.sku} sku={params.sku} />;
}
