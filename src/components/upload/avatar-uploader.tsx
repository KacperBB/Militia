"use client";

import { useState } from "react";

import { useUploadThing } from "@/lib/uploadthing";

type AvatarUploaderProps = {
  label?: string;
  currentUrl?: string;
  onUploaded: (url: string) => void;
};

function AvatarPreview({ src, label }: { src?: string; label: string }) {
  return (
    <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={label} className="h-full w-full object-cover" src={src} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">Brak</div>
      )}
    </div>
  );
}

export function AvatarUploader({ label = "Zdjecie profilowe", currentUrl, onUploaded }: AvatarUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  const { startUpload } = useUploadThing("avatarUploader", {
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

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-4">
        <AvatarPreview label={label} src={localPreviewUrl ?? currentUrl} />

        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium text-slate-700">{label}</label>
          <input
            accept="image/*"
            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            disabled={isUploading}
            onChange={async (event) => {
              const file = event.target.files?.[0];

              if (!file) {
                return;
              }

              setLocalPreviewUrl(URL.createObjectURL(file));
              setIsUploading(true);
              setError(null);
              await startUpload([file]);
            }}
            type="file"
          />
          <p className="text-xs text-slate-500">PNG / JPG, max 4MB</p>
        </div>
      </div>

      {isUploading ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Przesylanie obrazu...</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              w toku
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/2 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-amber-500" />
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
