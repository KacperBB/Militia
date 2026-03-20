import { create } from "zustand";

type CategorySelectionSource = "auto" | "manual" | "none";

type CreatePostFormStoreState = {
  categoryId: string;
  categorySearchQuery: string;
  categorySelectionSource: CategorySelectionSource;
  categoryRequiredError: boolean;
  initializeCategory: (payload: { categoryId?: string; categorySelectionSource?: CategorySelectionSource }) => void;
  setCategorySearchQuery: (value: string) => void;
  selectCategory: (categoryId: string, source: Exclude<CategorySelectionSource, "none">) => void;
  clearCategorySelection: () => void;
  setCategoryRequiredError: (value: boolean) => void;
  reset: () => void;
};

const initialState = {
  categoryId: "",
  categorySearchQuery: "",
  categorySelectionSource: "none" as CategorySelectionSource,
  categoryRequiredError: false,
};

export const useCreatePostFormStore = create<CreatePostFormStoreState>((set) => ({
  ...initialState,
  initializeCategory: ({ categoryId = "", categorySelectionSource = "none" }) =>
    set({
      categoryId,
      categorySearchQuery: "",
      categorySelectionSource,
      categoryRequiredError: false,
    }),
  setCategorySearchQuery: (value) => set({ categorySearchQuery: value }),
  selectCategory: (categoryId, source) =>
    set({
      categoryId,
      categorySearchQuery: "",
      categorySelectionSource: source,
      categoryRequiredError: false,
    }),
  clearCategorySelection: () =>
    set({
      categoryId: "",
      categorySelectionSource: "none",
      categoryRequiredError: true,
    }),
  setCategoryRequiredError: (value) => set({ categoryRequiredError: value }),
  reset: () => set(initialState),
}));

export type { CategorySelectionSource };