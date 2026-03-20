"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function CreatedPostRedirect({ href, delayMs }: { href: string; delayMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      router.replace(href);
      router.refresh();
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, href, router]);

  return null;
}
