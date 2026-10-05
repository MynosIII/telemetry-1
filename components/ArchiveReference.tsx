import Link from "next/link";
import type { ArchiveRef } from "@/lib/championship-history";

export function ArchiveReference({ entity }: { entity: ArchiveRef | null | undefined }) {
  if (!entity) return <>—</>;
  return entity.href ? <Link href={entity.href} prefetch={false}>{entity.name}</Link> : <>{entity.name}</>;
}
