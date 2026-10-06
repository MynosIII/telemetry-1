import Image from "next/image";
import type { ArchiveMedia } from "@/lib/championship-history";

export function ArchiveMediaFigure({ media, alt }: { media: ArchiveMedia; alt: string }) {
  const cc = media.license.match(/CC (BY(?:-SA)?) (\d\.\d)/);
  const licenseUrl = cc ? `https://creativecommons.org/licenses/${cc[1].toLowerCase()}/${cc[2]}/` : "https://creativecommons.org/publicdomain/mark/1.0/";
  return <figure className="archive-media"><Image src={media.url} alt={alt} width={640} height={450} unoptimized loading="lazy" />{media.caption || media.author ? <figcaption>{media.caption ? <span>{media.caption}</span> : null}{media.author ? <><a href={media.source} target="_blank" rel="noreferrer">{media.author}</a>{media.license ? <> · <a href={licenseUrl} target="_blank" rel="noreferrer">{media.license}</a></> : null}</> : null}</figcaption> : null}</figure>;
}
