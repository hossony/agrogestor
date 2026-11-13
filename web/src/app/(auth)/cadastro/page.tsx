import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Criar conta' };

export default async function Page() {
  if (await currentUser()) redirect('/feed');
  return <AuthForm mode="register" />;
}
