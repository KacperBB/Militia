import { hasEnoughPhoneDigits, validateNip } from "@/lib/auth/validators";
import type { PasswordStrength } from "@/lib/auth/password-strength";

export type RegisterWizardStep = "accountType" | "identity" | "company" | "security";

export type RegisterWizardDraft = {
  accountType: "PRIVATE" | "COMPANY" | string;
  email: string;
  emailConfirm: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  companyNip: string;
  companyEmail: string;
  companyPhone: string;
  companyCity: string;
  companyAcceptedTerms: boolean;
  sameCompanyEmail: boolean;
  sameCompanyPhone: boolean;
};

export type RegisterWizardValidation = {
  canContinue: boolean;
  errors: Partial<Record<string, string>>;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUsername(value: string) {
  return /^[a-zA-Z0-9._-]{3,30}$/.test(value);
}

export function getRegisterWizardSteps(accountType: string): RegisterWizardStep[] {
  return accountType === "COMPANY"
    ? ["accountType", "identity", "company", "security"]
    : ["accountType", "identity", "security"];
}

export function validateRegisterWizardStep(
  step: RegisterWizardStep,
  draft: RegisterWizardDraft,
  passwordStrength: PasswordStrength,
): RegisterWizardValidation {
  const errors: Partial<Record<string, string>> = {};

  if (step === "accountType") {
    if (draft.accountType !== "PRIVATE" && draft.accountType !== "COMPANY") {
      errors.accountType = "Wybierz typ konta.";
    }
  }

  if (step === "identity") {
    if (!draft.email.trim()) {
      errors.email = "Email jest wymagany.";
    } else if (!isValidEmail(draft.email.trim())) {
      errors.email = "Podaj poprawny adres email.";
    }

    if (!draft.emailConfirm.trim()) {
      errors.emailConfirm = "Potwierdzenie email jest wymagane.";
    } else if (draft.emailConfirm.trim() !== draft.email.trim()) {
      errors.emailConfirm = "Adresy email nie zgadzają się.";
    }

    if (!draft.username.trim()) {
      errors.username = "Nazwa użytkownika jest wymagana.";
    } else if (!isValidUsername(draft.username.trim())) {
      errors.username = "Nazwa użytkownika musi mieć 3-30 znaków i zawierać tylko litery, cyfry, kropki, podkreślenia oraz myślniki.";
    }

    if (draft.phone.trim() && !hasEnoughPhoneDigits(draft.phone.trim())) {
      errors.phone = "Telefon musi zawierać co najmniej 7 cyfr.";
    }
  }

  if (step === "company" && draft.accountType === "COMPANY") {
    if (!draft.companyName.trim()) {
      errors.companyName = "Nazwa firmy jest wymagana.";
    }

    if (!draft.companyCity.trim()) {
      errors.companyCity = "Miasto firmy jest wymagane.";
    }

    if (!draft.sameCompanyEmail && draft.companyEmail.trim() && !isValidEmail(draft.companyEmail.trim())) {
      errors.companyEmail = "Podaj poprawny email firmowy.";
    }

    if (!draft.sameCompanyPhone && draft.companyPhone.trim() && !hasEnoughPhoneDigits(draft.companyPhone.trim())) {
      errors.companyPhone = "Telefon firmowy musi zawierać co najmniej 7 cyfr.";
    }

    if (draft.companyNip.trim() && !validateNip(draft.companyNip.trim())) {
      errors.companyNip = "Podaj poprawny NIP.";
    }
  }

  if (step === "security") {
    if (!draft.password) {
      errors.password = "Hasło jest wymagane.";
    } else if (!passwordStrength.isStrong) {
      errors.password = "Hasło jest zbyt słabe.";
    }

    if (!draft.confirmPassword) {
      errors.confirmPassword = "Potwierdzenie hasła jest wymagane.";
    } else if (draft.confirmPassword !== draft.password) {
      errors.confirmPassword = "Hasła nie zgadzają się.";
    }

    if (draft.accountType === "COMPANY" && !draft.companyAcceptedTerms) {
      errors.companyAcceptedTerms = "Musisz zaakceptować warunki dla kont firmowych.";
    }
  }

  return {
    canContinue: Object.keys(errors).length === 0,
    errors,
  };
}
