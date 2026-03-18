"use client";

import { useState } from "react";

type ListingGalleryImage = {
  id: string;
  storage_key: string;
};

type ListingGalleryProps = {
  images: ListingGalleryImage[];
  title: string;
};

function resolveImageSource(image: ListingGalleryImage | null) {
  if (!image?.storage_key) {
    return null;
  }

  if (image.storage_key.startsWith("http://") || image.storage_key.startsWith("https://") || image.storage_key.startsWith("/")) {
    return image.storage_key;
  }

  return null;
}

export function ListingGallery({ images, title }: ListingGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? null;
  const activeImageSrc = resolveImageSource(activeImage);

  if (!images.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        Galeria zdjec zostanie wyswietlona tutaj po dodaniu fotografii do ogloszenia.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        {activeImageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={activeImageSrc} alt={title} className="h-105 w-full object-cover" />
        ) : (
          <div className="flex h-105 items-center justify-center bg-linear-to-br from-slate-900 via-slate-700 to-amber-500 p-8 text-center text-sm font-semibold text-white">
            {activeImage?.storage_key || "Zdjecie ogloszenia"}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((image, index) => {
          const imageSrc = resolveImageSource(image);
          return (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`overflow-hidden rounded-xl border ${index === activeIndex ? "border-amber-500" : "border-slate-200"}`}
            >
              {imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageSrc} alt={`${title} ${index + 1}`} className="h-24 w-full object-cover" />
              ) : (
                <div className="flex h-24 items-center justify-center bg-slate-200 px-2 text-[11px] font-medium text-slate-600">
                  {image.storage_key}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
