"use client";

import { useState } from "react";

import { useUploadThing } from "@/lib/uploadthing";

type BannerUploaderProps = {
  label?: string;
  currentUrl?: string;
  onUploaded: (url: string) => void;
};

export function BannerUploader({ label = "Baner sprzedawcy", currentUrl, onUploaded }: BannerUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  const { startUpload } = useUploadThing("bannerUploader", {
    onClientUploadComplete: (files) => {
      const first = files[0];

      if (!first?.ufsUrl) {
        setError("Upload zakonczyl sie bez URL pliku.");
        setIsUploading(false);
        return;
      }

      onUploaded(first.ufsUrl);
      setLocalPreviewUrl(first.ufsUrl);
      setError(null);
      setIsUploading(false);
    },
    onUploadError: (uploadError) => {
      setError(uploadError.message || "Nie udalo sie przeslac obrazu.");
      setIsUploading(false);
    },
  });

  const previewSrc = localPreviewUrl ?? currentUrl;

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <label className="text-sm font-medium text-slate-700">{label}</label>

      {previewSrc ? (
        <div className="relative h-28 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={label} className="h-full w-full object-cover" src={previewSrc} />
        </div>
      ) : (
        <div className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
          Brak banera — zalecany rozmiar 1200×300 px
        </div>
      )}

      <input
        accept="image/*"
        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        disabled={isUploading}
        onChange={async (event) => {
          const file = event.target.files?.[0];

          if (!file) return;

          setLocalPreviewUrl(URL.createObjectURL(file));
          setIsUploading(true);
          setError(null);
          await startUpload([file]);
        }}
        type="file"
      />
      <p className="text-xs text-slate-500">PNG / JPG, max 8 MB. Zalecany format poziomy (4:1).</p>

      {isUploading ? <p className="text-xs text-amber-600">Przesyłanie...</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
