"use client";

import { useState } from "react";

import { useUploadThing } from "@/lib/uploadthing";

export type UploadedListingImage = {
  id: string;
  url: string;
  fileKey: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
};

type ListingImagesUploaderProps = {
  images: UploadedListingImage[];
  onChange: (images: UploadedListingImage[]) => void;
};

export function ListingImagesUploader({ images, onChange }: ListingImagesUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload } = useUploadThing("listingImageUploader", {
    onClientUploadComplete: (files) => {
      const nextImages = files
        .filter((file) => file.ufsUrl)
        .map((file) => ({
          id: file.key,
          url: file.ufsUrl,
          fileKey: file.key,
          fileName: file.name,
          mimeType: file.type || null,
          sizeBytes: typeof file.size === "number" ? file.size : null,
        }));

      onChange([...images, ...nextImages]);
      setIsUploading(false);
      setError(null);
    },
    onUploadError: (uploadError) => {
      setError(uploadError.message || "Nie udalo sie przeslac zdjec ogloszenia.");
      setIsUploading(false);
    },
  });

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Zdjecia ogloszenia</h2>
        <p className="mt-1 text-xs text-slate-500">Mozesz dodac do 10 zdjec. Pierwsze zdjecie stanie sie glownym obrazem ogloszenia.</p>
      </div>

      <input
        type="file"
        accept="image/*"
        multiple
        disabled={isUploading || images.length >= 10}
        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []).slice(0, Math.max(10 - images.length, 0));

          if (!files.length) {
            return;
          }

          setIsUploading(true);
          setError(null);
          await startUpload(files);
          event.target.value = "";
        }}
      />

      {isUploading ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Przesylanie zdjec...</span>
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

      {error ? <p className="text-xs font-medium text-rose-700">{error}</p> : null}

      {images.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {images.map((image, index) => (
            <div key={image.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="relative h-32 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.fileName} className="h-full w-full object-cover" />
                {index === 0 ? (
                  <div className="absolute left-2 top-2 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                    Glowne
                  </div>
                ) : null}
              </div>
              <div className="space-y-2 p-3">
                <p className="line-clamp-2 text-xs text-slate-600">{image.fileName}</p>
                <button
                  type="button"
                  onClick={() => onChange(images.filter((currentImage) => currentImage.id !== image.id))}
                  className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Usun
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Nie dodano jeszcze zadnych zdjec.
        </div>
      )}
    </section>
  );
}