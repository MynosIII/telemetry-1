"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/** Keep a deliberate placeholder visible when a third-party image fails. */
export default function ResilientImage({ src, alt, ...props }: ImageProps) {
  const [failedSource, setFailedSource] = useState<ImageProps["src"] | null>(null);
  const failed = failedSource === src;
  return <Image {...props} src={failed ? "/image-unavailable.svg" : src}
    alt={failed ? `${alt ? `${alt} — ` : ""}Imagen no disponible / Image unavailable` : alt}
    onError={() => { if (!failed) setFailedSource(src); }} />;
}
