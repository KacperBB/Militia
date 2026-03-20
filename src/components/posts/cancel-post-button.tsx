"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CancelPostButtonProps = {
  postId: string;
  disabled?: boolean;
};

export function CancelPostButton({ postId, disabled = false }: CancelPostButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCancel() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CANCEL" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to cancel listing.");
      }

      router.refresh();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Failed to cancel listing.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => void onCancel()}
        disabled={disabled || isSubmitting}
        className="rounded-md border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Anulowanie..." : "Anuluj ogloszenie"}
      </button>
      {error ? <p className="text-xs font-medium text-rose-700">{error}</p> : null}
    </div>
  );
}
