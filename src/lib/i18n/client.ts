"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LOCALES = ["pl", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const resources = {
  pl: {
    translation: {
      "nav.login": "Zaloguj sie",
      "nav.register": "Zarejestruj",
      "nav.settings": "Ustawienia",
      "nav.siteSettings": "Ustawienia witryny",
      "nav.logout": "Wyloguj sie",
      "nav.dashboard": "Dashboard",
      "home.hero.title": "Marketplace w stylu OLX z auth, firmami i bezpiecznym onboardingiem od pierwszego etapu.",
      "home.hero.body": "Masz juz gotowy fundament PostgreSQL + Prisma, seedy testowe oraz pierwszy pelny przeplyw rejestracji i logowania z weryfikacja mailowa, kontem firmowym i logowaniem przez Google.",
      "home.cta.register": "Zarejestruj konto",
      "home.cta.login": "Zaloguj sie",
      "home.cta.dashboard": "Przejdz do dashboardu",
      "home.session.title": "Stan sesji",
      "home.session.welcome": "Witaj",
      "home.session.none": "Brak aktywnej sesji",
      "home.session.active": "Sesja jest utrzymywana w bazie, a ciasteczko trzyma tylko losowy token. To pozwala Ci centralnie uniewazniac logowania.",
      "home.session.inactive": "Po rejestracji dostaniesz mail weryfikacyjny. Po potwierdzeniu adresu email konto zaloguje sie automatycznie.",
      "home.info.hash": "Haslo jest hashowane w osobnej tabeli user_credentials.",
      "home.info.tokens": "Token weryfikacyjny i token sesji sa przechowywane jako hash.",
      "home.info.company": "Konto firmowe moze byc prefillowane z Google Places, ale decyzja o rejestracji pozostaje po stronie uzytkownika.",
      "login.badge": "Autoryzacja",
      "login.title": "Zaloguj sie do Militia",
      "login.subtitle": "Logowanie dziala po emailu lub po nazwie uzytkownika. Nieprzetwierdzony email blokuje start sesji, co porzadkuje bezpieczenstwo od pierwszego dnia.",
      "login.why": "Dlaczego tak",
      "login.why.1": "Sesja jest trzymana w bazie, a w cookie siedzi tylko losowy token. Po stronie bazy przechowujemy jego hash.",
      "login.why.2": "To daje Ci mozliwosc wylogowania konkretnej sesji, uniewazniania aktywnych logowan i pelnego audytu ruchu.",
      "login.why.3": "Ten model jest prostszy i bardziej kontrolowalny na starcie niz rozproszony JWT bez centralnej invalidacji.",
      "login.form.identifier": "Email lub nazwa uzytkownika",
      "login.form.password": "Haslo",
      "login.form.forgot": "Zapomniales hasla?",
      "login.form.reset": "Zresetuj haslo",
      "login.form.submit": "Zaloguj sie",
      "login.form.submitting": "Logowanie...",
      "login.form.google": "Kontynuuj z Google",
      "login.form.noAccount": "Nie masz konta?",
      "login.form.register": "Zarejestruj sie",
      "login.form.success": "Zalogowano pomyslnie.",
      "login.form.error": "Logowanie nie powiodlo sie.",
    },
  },
  en: {
    translation: {
      "nav.login": "Log in",
      "nav.register": "Register",
      "nav.settings": "Settings",
      "nav.siteSettings": "Site settings",
      "nav.logout": "Log out",
      "nav.dashboard": "Dashboard",
      "home.hero.title": "An OLX-style marketplace with auth, company profiles, and secure onboarding from day one.",
      "home.hero.body": "You already have a PostgreSQL + Prisma foundation, test seeds, and a full registration/login flow with email verification, company accounts, and Google sign-in.",
      "home.cta.register": "Create account",
      "home.cta.login": "Log in",
      "home.cta.dashboard": "Go to dashboard",
      "home.session.title": "Session status",
      "home.session.welcome": "Welcome",
      "home.session.none": "No active session",
      "home.session.active": "The session is stored in the database, and the cookie holds only a random token. This lets you centrally revoke logins.",
      "home.session.inactive": "After registration, you will get a verification email. Once confirmed, your account will sign in automatically.",
      "home.info.hash": "Passwords are hashed in a separate user_credentials table.",
      "home.info.tokens": "Verification and session tokens are stored as hashes.",
      "home.info.company": "Company profile data can be prefilled from Google Places, but registration remains user-controlled.",
      "login.badge": "Authorization",
      "login.title": "Log in to Militia",
      "login.subtitle": "You can sign in with email or username. Unverified email blocks session start, improving security from day one.",
      "login.why": "Why this approach",
      "login.why.1": "The session lives in the database, while the cookie stores only a random token. Its hash is persisted server-side.",
      "login.why.2": "This allows revoking a specific session, invalidating active logins, and keeping a full audit trail.",
      "login.why.3": "This model is simpler and more controllable at the beginning than distributed JWT without central invalidation.",
      "login.form.identifier": "Email or username",
      "login.form.password": "Password",
      "login.form.forgot": "Forgot your password?",
      "login.form.reset": "Reset password",
      "login.form.submit": "Log in",
      "login.form.submitting": "Signing in...",
      "login.form.google": "Continue with Google",
      "login.form.noAccount": "No account yet?",
      "login.form.register": "Register",
      "login.form.success": "Signed in successfully.",
      "login.form.error": "Sign-in failed.",
    },
  },
};

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: "pl",
    fallbackLng: "pl",
    interpolation: {
      escapeValue: false,
    },
  });
}

export { i18n };