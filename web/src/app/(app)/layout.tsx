import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await currentUser();
  if (!me) redirect('/entrar');
  return <AppShell me={me}>{children}</AppShell>;
}
