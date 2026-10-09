"use client";

import { FallbackImage } from "./FallbackImage";
import type { CarImage } from "@/lib/team-media";

const licenseUrl = (license: string) => {
  const cc = /^CC (BY(?:-SA)?) (\d\.\d)/.exec(license);
  return cc ? `https://creativecommons.org/licenses/${cc[1].toLowerCase()}/${cc[2]}/` : /^CC0/.test(license) ? "https://creativecommons.org/publicdomain/zero/1.0/" : null;
};

/** A car's own photo file, then the archive's licensed photo; nothing when there is neither. */
export function CarPhoto({ image, alt }: { image: CarImage; alt: string }) {
  if (!image.sources.length) return null;
  return <figure className="archive-media car-photo">
    <FallbackImage sources={image.sources} alt={alt} fallback={null} caption={i => {
      const credit = image.credits[i];
      if (!credit?.author) return null;
      const url = licenseUrl(credit.license);
      return <figcaption>{credit.caption ? <span>{credit.caption}</span> : null}<a href={credit.source} target="_blank" rel="noreferrer">{credit.author}</a>{credit.license ? <> · {url ? <a href={url} target="_blank" rel="noreferrer">{credit.license}</a> : credit.license}</> : null}</figcaption>;
    }} />
  </figure>;
}
