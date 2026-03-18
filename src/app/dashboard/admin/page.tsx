import { getCurrentSession } from '@/lib/auth/session';
import { AdminDashboardContent } from '@/components/dashboard/admin-dashboard-content';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
  const session = await getCurrentSession();

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login');
  }

  return <AdminDashboardContent usernameOrEmail={session.user.username || session.user.email} />;
}
