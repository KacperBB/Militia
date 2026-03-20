import test from "node:test";
import assert from "node:assert/strict";

import { checkPasswordStrength } from "../src/lib/auth/password-strength";
import {
  getRegisterWizardSteps,
  validateRegisterWizardStep,
  type RegisterWizardDraft,
} from "../src/lib/auth/register-wizard";

function validDraft(overrides: Partial<RegisterWizardDraft> = {}): RegisterWizardDraft {
  return {
    accountType: "PRIVATE",
    email: "user@example.com",
    emailConfirm: "user@example.com",
    username: "test_user",
    firstName: "Jan",
    lastName: "Kowalski",
    phone: "+48 123 456 789",
    password: "StrongPass1!",
    confirmPassword: "StrongPass1!",
    companyName: "Comarch",
    companyNip: "5260001246",
    companyEmail: "firma@example.com",
    companyPhone: "+48 111 222 333",
    companyCity: "Rzeszów",
    companyAcceptedTerms: true,
    sameCompanyEmail: false,
    sameCompanyPhone: false,
    ...overrides,
  };
}

test("getRegisterWizardSteps returns 3 steps for PRIVATE", () => {
  assert.deepEqual(getRegisterWizardSteps("PRIVATE"), ["accountType", "identity", "security"]);
});

test("getRegisterWizardSteps returns 4 steps for COMPANY", () => {
  assert.deepEqual(getRegisterWizardSteps("COMPANY"), ["accountType", "identity", "company", "security"]);
});

test("accountType step blocks invalid type", () => {
  const result = validateRegisterWizardStep(
    "accountType",
    validDraft({ accountType: "OTHER" }),
    checkPasswordStrength("StrongPass1!"),
  );
  assert.equal(result.canContinue, false);
  assert.equal(result.errors.accountType, "Wybierz typ konta.");
});

test("identity step blocks missing email", () => {
  const result = validateRegisterWizardStep(
    "identity",
    validDraft({ email: "" }),
    checkPasswordStrength("StrongPass1!"),
  );
  assert.equal(result.canContinue, false);
  assert.equal(result.errors.email, "Email jest wymagany.");
});

test("identity step blocks invalid email confirmation mismatch", () => {
  const result = validateRegisterWizardStep(
    "identity",
    validDraft({ emailConfirm: "other@example.com" }),
    checkPasswordStrength("StrongPass1!"),
  );
  assert.equal(result.canContinue, false);
  assert.equal(result.errors.emailConfirm, "Adresy email nie zgadzają się.");
});

test("identity step blocks invalid username", () => {
  const result = validateRegisterWizardStep(
    "identity",
    validDraft({ username: "a b" }),
    checkPasswordStrength("StrongPass1!"),
  );
  assert.equal(result.canContinue, false);
  assert.ok(result.errors.username);
});

test("identity step blocks short phone", () => {
  const result = validateRegisterWizardStep(
    "identity",
    validDraft({ phone: "+48" }),
    checkPasswordStrength("StrongPass1!"),
  );
  assert.equal(result.canContinue, false);
  assert.equal(result.errors.phone, "Telefon musi zawierać co najmniej 7 cyfr.");
});

test("company step blocks missing company name", () => {
  const result = validateRegisterWizardStep(
    "company",
    validDraft({ accountType: "COMPANY", companyName: "" }),
    checkPasswordStrength("StrongPass1!"),
  );
  assert.equal(result.canContinue, false);
  assert.equal(result.errors.companyName, "Nazwa firmy jest wymagana.");
});

test("company step blocks missing company city", () => {
  const result = validateRegisterWizardStep(
    "company",
    validDraft({ accountType: "COMPANY", companyCity: "" }),
    checkPasswordStrength("StrongPass1!"),
  );
  assert.equal(result.canContinue, false);
  assert.equal(result.errors.companyCity, "Miasto firmy jest wymagane.");
});

test("company step blocks invalid company NIP", () => {
  const result = validateRegisterWizardStep(
    "company",
    validDraft({ accountType: "COMPANY", companyNip: "6770020613" }),
    checkPasswordStrength("StrongPass1!"),
  );
  assert.equal(result.canContinue, false);
  assert.equal(result.errors.companyNip, "Podaj poprawny NIP.");
});

test("company step allows sameCompanyEmail without separate company email", () => {
  const result = validateRegisterWizardStep(
    "company",
    validDraft({ accountType: "COMPANY", sameCompanyEmail: true, companyEmail: "" }),
    checkPasswordStrength("StrongPass1!"),
  );
  assert.equal(result.errors.companyEmail, undefined);
});

test("company step allows sameCompanyPhone without separate company phone", () => {
  const result = validateRegisterWizardStep(
    "company",
    validDraft({ accountType: "COMPANY", sameCompanyPhone: true, companyPhone: "" }),
    checkPasswordStrength("StrongPass1!"),
  );
  assert.equal(result.errors.companyPhone, undefined);
});

test("security step blocks weak password", () => {
  const result = validateRegisterWizardStep(
    "security",
    validDraft({ password: "abc", confirmPassword: "abc" }),
    checkPasswordStrength("abc"),
  );
  assert.equal(result.canContinue, false);
  assert.equal(result.errors.password, "Hasło jest zbyt słabe.");
});

test("security step blocks password mismatch", () => {
  const result = validateRegisterWizardStep(
    "security",
    validDraft({ confirmPassword: "OtherPass1!" }),
    checkPasswordStrength("StrongPass1!"),
  );
  assert.equal(result.canContinue, false);
  assert.equal(result.errors.confirmPassword, "Hasła nie zgadzają się.");
});

test("security step blocks missing company accepted terms for company account", () => {
  const result = validateRegisterWizardStep(
    "security",
    validDraft({ accountType: "COMPANY", companyAcceptedTerms: false }),
    checkPasswordStrength("StrongPass1!"),
  );
  assert.equal(result.canContinue, false);
  assert.equal(result.errors.companyAcceptedTerms, "Musisz zaakceptować warunki dla kont firmowych.");
});

test("wizard passes valid company draft", () => {
  const result = validateRegisterWizardStep(
    "company",
    validDraft({ accountType: "COMPANY" }),
    checkPasswordStrength("StrongPass1!"),
  );
  assert.equal(result.canContinue, true);
  assert.deepEqual(result.errors, {});
});
