import { getCurrentSession } from '@/lib/auth/session';
import { UserDashboardContent } from '@/components/dashboard/user-dashboard-content';
import { redirect } from 'next/navigation';

export default async function UserDashboard() {
  const session = await getCurrentSession();

  if (!session || session.user.role !== 'USER') {
    redirect('/auth/login');
  }

  return <UserDashboardContent usernameOrEmail={session.user.username || session.user.email} />;
}
