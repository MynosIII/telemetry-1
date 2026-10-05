"use client";

import { FallbackImage } from "./FallbackImage";
import type { CarImage } from "@/lib/team-media";

const licenseUrl = (license: string) => license === "CC BY 2.0" ? "https://creativecommons.org/licenses/by/2.0/" : license === "CC BY-SA 2.0" ? "https://creativecommons.org/licenses/by-sa/2.0/" : null;

/** A car's own photo file, then the archive's licensed photo, then a placeholder. */
export function CarPhoto({ image, alt }: { image: CarImage; alt: string }) {
  return <figure className="archive-media car-photo">
    <FallbackImage sources={image.sources} alt={alt} fallback={<div className="car-no-photo"><span>{alt}</span><small>Foto pendiente</small></div>} caption={i => {
      const credit = image.credits[i];
      if (!credit?.author) return null;
      const url = licenseUrl(credit.license);
      return <figcaption>{credit.caption ? <span>{credit.caption}</span> : null}<a href={credit.source} target="_blank" rel="noreferrer">{credit.author}</a>{credit.license ? <> · {url ? <a href={url} target="_blank" rel="noreferrer">{credit.license}</a> : credit.license}</> : null}</figcaption>;
    }} />
  </figure>;
}
