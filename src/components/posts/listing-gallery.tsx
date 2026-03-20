"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const hasMultipleImages = images.length > 1;
  const activeImage = images[activeIndex] ?? null;
  const activeImageSrc = resolveImageSource(activeImage);

  useEffect(() => {
    if (!thumbnailsRef.current) {
      return;
    }

    const activeThumbnail = thumbnailsRef.current.querySelector<HTMLElement>(`[data-thumbnail-index="${activeIndex}"]`);
    activeThumbnail?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  useEffect(() => {
    if (!isLightboxOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
        return;
      }

      if (event.key === "ArrowLeft") {
        goToPrevious();
      }

      if (event.key === "ArrowRight") {
        goToNext();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLightboxOpen]);

  function goToPrevious() {
    setActiveIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  }

  function goToNext() {
    setActiveIndex((current) => (current === images.length - 1 ? 0 : current + 1));
  }

  function handleThumbnailWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!thumbnailsRef.current) {
      return;
    }

    if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
      return;
    }

    event.preventDefault();
    thumbnailsRef.current.scrollBy({ top: event.deltaY, behavior: "smooth" });
  }

  if (!images.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        Galeria zdjec zostanie wyswietlona tutaj po dodaniu fotografii do ogloszenia.
      </div>
    );
  }

  return (
    <>
      <div className={hasMultipleImages ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_124px]" : "grid gap-4"}>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        {activeImageSrc ? (
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="block h-full w-full cursor-zoom-in"
            aria-label="Otwórz zdjęcie w pełnym ekranie"
          >
            <Image
              src={activeImageSrc}
              alt={title}
              width={1200}
              height={900}
              sizes="(max-width: 1024px) 100vw, 900px"
              priority
              className="h-[320px] w-full object-cover sm:h-[420px] lg:h-[520px]"
            />
          </button>
        ) : (
          <div className="flex h-[320px] items-center justify-center bg-linear-to-br from-slate-900 via-slate-700 to-amber-500 p-8 text-center text-sm font-semibold text-white sm:h-[420px] lg:h-[520px]">
            {activeImage?.storage_key || "Zdjecie ogloszenia"}
          </div>
        )}

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-slate-900 shadow-sm transition hover:bg-white"
              aria-label="Poprzednie zdjęcie"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-slate-900 shadow-sm transition hover:bg-white"
              aria-label="Następne zdjęcie"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <div
          ref={thumbnailsRef}
          onWheel={handleThumbnailWheel}
          className="grid grid-cols-4 gap-3 overflow-x-auto pb-1 sm:grid-cols-5 lg:max-h-[520px] lg:grid-cols-1 lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1"
          style={{ scrollSnapType: "y mandatory" }}
        >
          {images.map((image, index) => {
            const imageSrc = resolveImageSource(image);
            const isActive = index === activeIndex;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                data-thumbnail-index={index}
                className={`group relative overflow-hidden rounded-xl border transition ${
                  isActive ? "border-amber-500 ring-2 ring-amber-200" : "border-slate-200 hover:border-slate-300"
                }`}
                aria-pressed={isActive}
                style={{ scrollSnapAlign: "start" }}
              >
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={`${title} ${index + 1}`}
                    width={160}
                    height={96}
                    sizes="(max-width: 1024px) 25vw, 124px"
                    className="h-20 w-full object-cover lg:h-24"
                  />
                ) : (
                  <div className="flex h-20 items-center justify-center bg-slate-200 px-2 text-[11px] font-medium text-slate-600 lg:h-24">
                    {image.storage_key}
                  </div>
                )}
                <div className={`absolute inset-x-0 bottom-0 px-2 py-1 text-left text-[11px] font-semibold ${isActive ? "bg-slate-950 text-white" : "bg-white/85 text-slate-700"}`}>
                  {index + 1}/{images.length}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
      </div>

      {isLightboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Podgląd zdjęcia"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
            aria-label="Zamknij podgląd zdjęcia"
          >
            ×
          </button>

          {hasMultipleImages ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-4 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
                aria-label="Poprzednie zdjęcie"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
                aria-label="Następne zdjęcie"
              >
                ›
              </button>
            </>
          ) : null}

          <div
            className="flex max-h-[90vh] max-w-6xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            {activeImageSrc ? (
              <Image
                src={activeImageSrc}
                alt={title}
                width={1600}
                height={1200}
                sizes="100vw"
                unoptimized
                className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            ) : (
              <div className="flex min-h-[320px] min-w-[320px] items-center justify-center rounded-2xl bg-slate-800 p-8 text-center text-sm font-semibold text-white">
                {activeImage?.storage_key || "Zdjecie ogloszenia"}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
