import { getCurrentSession } from '@/lib/auth/session';
import { ModeratorDashboardContent } from '@/components/dashboard/moderator-dashboard-content';
import { redirect } from 'next/navigation';

export default async function ModeratorDashboard() {
  const session = await getCurrentSession();

  if (!session || !['MODERATOR', 'ADMIN'].includes(session.user.role)) {
    redirect('/auth/login');
  }

  return <ModeratorDashboardContent usernameOrEmail={session.user.username || session.user.email} />;
}
