import PCBuilder from '@/components/PCBuilder';

export default function BuildPage({ searchParams }: { searchParams: { share?: string | string[] } }) {
  const code = typeof searchParams.share === 'string' ? searchParams.share : '';
  return <PCBuilder shareCode={code} />;
}
