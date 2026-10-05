"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Tries each source in order and renders `fallback` once all of them fail.
 * Images that fail before hydration never fire onError, so the first source is re-checked on mount.
 */
export function FallbackImage({ sources, alt, fallback, className, caption }: { sources: string[]; alt: string; fallback: ReactNode; className?: string; caption?: (index: number) => ReactNode }) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setIndex(i => i + 1);
  }, []);
  if (index >= sources.length) return <>{fallback}</>;
  return <><img ref={ref} key={sources[index]} className={className} src={sources[index]} alt={alt} loading="lazy" onError={() => setIndex(index + 1)} />{caption?.(index)}</>;
}
