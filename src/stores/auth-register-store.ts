import { create } from "zustand";

type AccountType = "PRIVATE" | "COMPANY";

type BusinessLookupItem = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  googleMapsUrl?: string;
  websiteUrl?: string;
  businessStatus?: string;
};

type AuthRegisterState = {
  accountType: AccountType;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  confirmPassword: string;
  marketingConsent: boolean;
  companyName: string;
  companyNip: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyZipCode: string;
  companyCity: string;
  companyAcceptedTerms: boolean;
  companyMarketingConsent: boolean;
  googlePlaceId: string;
  googleMapsUrl: string;
  lookupResults: BusinessLookupItem[];
  lookupEnabled: boolean;
  isLookupLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  success: string | null;
  verificationPreview: string | null;
  setField: (field: keyof Omit<AuthRegisterState, "setField" | "setLookupState" | "setSubmitting" | "setError" | "setSuccess" | "applyBusinessLookupResult" | "reset">, value: string | boolean | BusinessLookupItem[] | null) => void;
  setLookupState: (payload: { results?: BusinessLookupItem[]; lookupEnabled?: boolean; isLookupLoading?: boolean }) => void;
  setSubmitting: (value: boolean) => void;
  setError: (value: string | null) => void;
  setSuccess: (value: string | null, preview?: string | null) => void;
  applyBusinessLookupResult: (item: BusinessLookupItem) => void;
  reset: () => void;
};

const initialState = {
  accountType: "PRIVATE" as AccountType,
  email: "",
  username: "",
  firstName: "",
  lastName: "",
  phone: "",
  password: "",
  confirmPassword: "",
  marketingConsent: false,
  companyName: "",
  companyNip: "",
  companyEmail: "",
  companyPhone: "",
  companyAddress: "",
  companyZipCode: "",
  companyCity: "",
  companyAcceptedTerms: false,
  companyMarketingConsent: false,
  googlePlaceId: "",
  googleMapsUrl: "",
  lookupResults: [] as BusinessLookupItem[],
  lookupEnabled: false,
  isLookupLoading: false,
  isSubmitting: false,
  error: null as string | null,
  success: null as string | null,
  verificationPreview: null as string | null,
};

export const useAuthRegisterStore = create<AuthRegisterState>((set) => ({
  ...initialState,
  setField: (field, value) => set({ [field]: value } as Partial<AuthRegisterState>),
  setLookupState: (payload) => set(payload),
  setSubmitting: (value) => set({ isSubmitting: value }),
  setError: (value) => set({ error: value }),
  setSuccess: (value, preview) => set({ success: value, verificationPreview: preview ?? null }),
  applyBusinessLookupResult: (item) =>
    set({
      companyName: item.name,
      companyAddress: item.address ?? "",
      companyPhone: item.phone ?? "",
      googlePlaceId: item.id,
      googleMapsUrl: item.googleMapsUrl ?? "",
    }),
  reset: () => set(initialState),
}));

export type { BusinessLookupItem, AccountType };
