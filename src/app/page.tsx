import { HomePageContent } from "@/components/home/home-page-content";
import { getCurrentSession } from "@/lib/auth/session";

export default async function Home() {
  const session = await getCurrentSession();
  const user = session
    ? {
        email: session.user.email,
        username: session.user.username,
        role: session.user.role,
      }
    : null;

  return <HomePageContent user={user} />;
}
