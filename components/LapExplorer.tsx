import Image from "@/components/ResilientImage";
import Link from "next/link";
import type { DriverLaps, DriverResult } from "@/lib/types";

export function LapExplorer({
  driver,
  options,
  round
}: {
  driver?: DriverLaps;
  options: DriverResult[];
  round: string;
}) {

  if (!driver) return <p className="empty-state">Los tiempos vuelta a vuelta todavía no están disponibles.</p>;

  return (
    <div className="lap-explorer">
      <div className="lap-driver-tabs" role="tablist" aria-label="Elegir piloto">
        {options.map((item) => (
          <Link
            role="tab"
            aria-selected={item.driverId === driver.driverId}
            className={item.driverId === driver.driverId ? "lap-driver is-active" : "lap-driver"}
            href={`/carreras/${round}?piloto=${item.driverId}#vueltas`}
            key={item.driverId}
          >
            <span className="lap-driver-image">
              {item.image ? <Image src={item.image} alt="" fill sizes="36px" unoptimized /> : item.name.slice(0, 1)}
            </span>
            <strong>{item.name}</strong>
          </Link>
        ))}
      </div>
      <div className="lap-table" role="tabpanel">
        <div className="lap-table-head"><span>VUELTA</span><span>POSICIÓN</span><span>TIEMPO</span></div>
        {driver.laps.map((lap) => (
          <div className="lap-row" key={lap.lap}>
            <strong>{lap.lap.padStart(2, "0")}</strong>
            <span>P{lap.position}</span>
            <code>{lap.time}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
