import { ArchiveReference } from "./ArchiveReference";
import { EntityFlag } from "./EntityFlag";
import type { ArchiveRef } from "@/lib/championship-history";

export function FlaggedReference({ entity }: { entity: ArchiveRef | null | undefined }) {
  if (!entity) return <ArchiveReference entity={entity} />;
  return (
    <span className="flagged-reference">
      <EntityFlag href={entity.href} />
      <ArchiveReference entity={entity} />
    </span>
  );
}
