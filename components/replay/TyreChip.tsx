import { compoundInfo } from "@/components/replay/tyres";

export function TyreChip({ compound, age }: { compound: string; age?: number | null }) {
  const info = compoundInfo(compound);
  return (
    <span className="tyre-chip" title={`${info.label}${age ? `, ${age} vueltas` : ""}`}>
      <b style={{ borderColor: info.color, color: info.color }}>{info.letter}</b>
      {age ? <small>{age}</small> : null}
    </span>
  );
}
