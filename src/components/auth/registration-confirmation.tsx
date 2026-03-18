import Link from 'next/link';
import { useEffect, useState } from 'react';

interface RegistrationConfirmationProps {
  email: string;
  onClose?: () => void;
}

export function RegistrationConfirmation({ email, onClose }: RegistrationConfirmationProps) {
  const [secondsLeft, setSecondsLeft] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Use window.location instead of router.push to avoid setState conflict
          window.location.href = '/auth/login';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        {/* Success Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mt-6 text-center text-2xl font-bold text-slate-900">Konto zostało utworzone!</h1>

        {/* Message */}
        <p className="mt-4 text-center text-slate-600">
          Wysłaliśmy link potwierdzający na adres:
        </p>
        <p className="mt-2 rounded-lg bg-slate-100 px-4 py-2 text-center font-mono text-sm text-slate-900">
          {email}
        </p>

        {/* Instructions */}
        <div className="mt-6 space-y-3 rounded-xl bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">Co dalej?</p>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-600"></span>
              <span>Sprawdź swoją skrzynkę pocztową</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-600"></span>
              <span>Kliknij link w mailu w ciągu 24 godzin</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-600"></span>
              <span>Jeśli nie widzisz maila, sprawdź folder SPAM</span>
            </li>
          </ul>
        </div>

        {/* Redirect Info */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Przekierowanie na stronę logowania za <span className="font-bold text-slate-900">{secondsLeft}</span> {secondsLeft === 1 ? 'sekundę' : 'sekund'}...
        </p>

        {/* Manual Redirect */}
        <Link
          href="/auth/login"
          className="mt-6 block rounded-full bg-amber-400 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-amber-300"
        >
          Przejdź do logowania
        </Link>

        {/* Back to Register */}
        <button
          onClick={onClose}
          className="mt-3 w-full rounded-full border border-slate-300 bg-white px-6 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Wróć do rejestracji
        </button>
      </div>
    </div>
  );
}
