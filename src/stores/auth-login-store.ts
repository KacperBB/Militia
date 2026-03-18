import { create } from "zustand";

type AuthLoginState = {
  identifier: string;
  password: string;
  isSubmitting: boolean;
  error: string | null;
  success: string | null;
  setField: (field: "identifier" | "password", value: string) => void;
  setSubmitting: (value: boolean) => void;
  setError: (value: string | null) => void;
  setSuccess: (value: string | null) => void;
  reset: () => void;
};

const initialState = {
  identifier: "",
  password: "",
  isSubmitting: false,
  error: null as string | null,
  success: null as string | null,
};

export const useAuthLoginStore = create<AuthLoginState>((set) => ({
  ...initialState,
  setField: (field, value) => set({ [field]: value } as Partial<AuthLoginState>),
  setSubmitting: (value) => set({ isSubmitting: value }),
  setError: (value) => set({ error: value }),
  setSuccess: (value) => set({ success: value }),
  reset: () => set(initialState),
}));
