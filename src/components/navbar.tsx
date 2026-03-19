'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/components/providers/locale-provider';
import { debounce } from '@/lib/utils/debounce';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      } finally {
        setLoading(false);
      }
    };

    const debouncedFetchSession = debounce(() => {
      void fetchSession();
    }, 250);

    const onAuthChanged = () => {
      debouncedFetchSession();
    };

    void fetchSession();
    window.addEventListener('militia-auth-changed', onAuthChanged);

    return () => {
      debouncedFetchSession.cancel();
      window.removeEventListener('militia-auth-changed', onAuthChanged);
    };
  }, [pathname]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const pingPresence = async () => {
      if (document.visibilityState !== 'visible' || !window.navigator.onLine) {
        return;
      }

      try {
        await fetch('/api/auth/presence', {
          method: 'POST',
          cache: 'no-store',
        });
      } catch (error) {
        console.error('Presence ping failed:', error);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void pingPresence();
      }
    };

    const intervalId = window.setInterval(() => {
      void pingPresence();
    }, 60_000);

    void pingPresence();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.dispatchEvent(new Event('militia-auth-changed'));
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="text-2xl font-bold text-slate-950">⚔️ Militia</div>
          </Link>

          {/* Desktop Navigation */}
          <div className="flex items-center gap-4">
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
              <button
                className={`rounded-full px-2 py-1 text-xs font-semibold ${locale === 'pl' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                onClick={() => setLocale('pl')}
                type="button"
              >
                PL
              </button>
              <button
                className={`rounded-full px-2 py-1 text-xs font-semibold ${locale === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                onClick={() => setLocale('en')}
                type="button"
              >
                EN
              </button>
            </div>

            {loading ? (
              <div className="h-10 w-20 animate-pulse rounded bg-slate-200" />
            ) : user ? (
              <>
                <Link
                  href="/ogloszenia/dodaj"
                  className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  Dodaj ogloszenie
                </Link>
                <Link
                  href="/ogloszenia"
                  className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Ogloszenia
                </Link>
                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200"
                  >
                    <span className="text-lg">👤</span>
                    <span className="hidden sm:inline">{user.username || user.email}</span>
                    <span className="text-xs text-slate-500">({user.role})</span>
                  </button>

                  {/* Dropdown Menu */}
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg">
                      <div className="border-b border-slate-100 p-4">
                        <div className="text-sm font-semibold text-slate-900">{user.username}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                      <Link
                        href={`/dashboard/${user.role.toLowerCase()}`}
                        className="block px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                        onClick={() => setShowMenu(false)}
                      >
                        📊 {t('nav.dashboard', 'Dashboard')}
                      </Link>
                      <Link
                        href="/ogloszenia/dodaj"
                        className="block px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                        onClick={() => setShowMenu(false)}
                      >
                        ➕ Dodaj ogloszenie
                      </Link>
                      <Link
                        href="/auth/settings"
                        className="block px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                        onClick={() => setShowMenu(false)}
                      >
                        ⚙️ {t('nav.settings', 'Settings')}
                      </Link>
                      {user.role === 'ADMIN' ? (
                        <Link
                          href="/dashboard/admin/site-settings"
                          className="block px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                          onClick={() => setShowMenu(false)}
                        >
                          🛡️ {t('nav.siteSettings', 'Site settings')}
                        </Link>
                      ) : null}
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                      >
                        🚪 {t('nav.logout', 'Log out')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/ogloszenia"
                  className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900 hover:bg-slate-100"
                >
                  Ogloszenia
                </Link>
                <Link
                  href="/auth/login"
                  className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-900 hover:bg-slate-100"
                >
                  {t('nav.login', 'Log in')}
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                >
                  {t('nav.register', 'Register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
