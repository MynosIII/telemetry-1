import Image from "next/image";
import type { ArchiveMedia } from "@/lib/championship-history";

export function ArchiveMediaFigure({ media, alt }: { media: ArchiveMedia; alt: string }) {
  const licenseUrl = media.license === "CC BY 2.0" ? "https://creativecommons.org/licenses/by/2.0/" : media.license === "CC BY-SA 2.0" ? "https://creativecommons.org/licenses/by-sa/2.0/" : "https://creativecommons.org/publicdomain/mark/1.0/";
  return <figure className="archive-media"><Image src={media.url} alt={alt} width={640} height={450} unoptimized loading="lazy" /><figcaption>{media.caption ? <span>{media.caption}</span> : null}<a href={media.source} target="_blank" rel="noreferrer">{media.author}</a> · <a href={licenseUrl} target="_blank" rel="noreferrer">{media.license}</a></figcaption></figure>;
}
