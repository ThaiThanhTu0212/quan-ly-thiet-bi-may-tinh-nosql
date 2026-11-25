import ProductComparison from '@/components/ProductComparison';
export default function ComparePage({searchParams}:{searchParams:{skus?:string|string[]}}){
  const skus=searchParams.skus===undefined?null:(Array.isArray(searchParams.skus)?searchParams.skus:searchParams.skus.split(',')).filter(Boolean);
  return <ProductComparison initialSkus={skus}/>;
}
