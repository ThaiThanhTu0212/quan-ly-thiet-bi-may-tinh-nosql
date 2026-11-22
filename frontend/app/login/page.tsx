import AuthForm from '@/components/AuthForm';

export default function LoginPage({ searchParams }: { searchParams: { registered?: string } }) {
  return <AuthForm registered={searchParams.registered === '1'} />;
}
