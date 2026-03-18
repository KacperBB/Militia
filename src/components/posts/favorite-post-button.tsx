"use client";

import { useState } from "react";

type FavoritePostButtonProps = {
  postId: string;
  initialIsFavorited: boolean;
  disabled?: boolean;
};

export function FavoritePostButton({ postId, initialIsFavorited, disabled = false }: FavoritePostButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onToggle() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/favorite`, {
        method: isFavorited ? "DELETE" : "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Favorite action failed.");
      }

      setIsFavorited((current: boolean) => !current);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Favorite action failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void onToggle()}
        disabled={disabled || isSubmitting}
        className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isFavorited ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-slate-900 text-white hover:bg-slate-800"
        }`}
      >
        {isFavorited ? "Usun z ulubionych" : "Polub ogloszenie"}
      </button>
      {error ? <p className="text-xs font-medium text-rose-700">{error}</p> : null}
    </div>
  );
}
