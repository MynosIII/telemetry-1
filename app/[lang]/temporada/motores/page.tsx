import type { Metadata } from "next";
import { SeasonShell, TeamName } from "@/components/season/SeasonShell";
import { teamOrder } from "@/lib/season-teams";
import { elementLabels, powerUnitSeason } from "@/lib/season-updates";

export const metadata: Metadata = {
  title: "Elementos de motor usados",
  description: "Cuántos motores, turbos, escapes, MGU-K, baterías y electrónicas usó cada piloto de Fórmula 1 en la temporada."
};

export default function PowerUnitsPage() {
  const { elements, allocation, drivers } = powerUnitSeason;
  const date = new Date(`${powerUnitSeason.date}T12:00:00Z`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const rows = [...drivers].sort((a, b) => teamOrder(a.team) - teamOrder(b.team));
  const manufacturers = [...new Set(drivers.map((driver) => driver.manufacturer))].map((name) => {
    const own = drivers.filter((driver) => driver.manufacturer === name);
    const over = own.reduce((sum, driver) => sum + elements.reduce((inner, element, index) => inner + Math.max(driver.used[index] - (allocation[element] ?? Infinity), 0), 0), 0);
    return { name, cars: own.length, over, perCar: over / own.length };
  }).sort((a, b) => b.perCar - a.perCar);

  return (
    <SeasonShell
      title="Elementos de motor usados"
      subtitle={`Hasta el ${powerUnitSeason.upTo}, según el informe de la FIA del ${date}.`}
      method={<>
        <p>La unidad de potencia se divide en siete elementos y cada piloto tiene un cupo por temporada. Para 2026 el reglamento fija 4 motores de combustión, turbos y escapes, y 3 MGU-K, baterías y electrónicas de control. Las celdas marcadas superan ese cupo; pasarlo suele costar puestos en la grilla, aunque el reglamento 2026 contempla excepciones, así que no toda celda marcada fue una sanción.</p>
        <p>Los auxiliares (PU-ANC) no tienen un cupo publicado y no se marcan. Fuente: <a href={powerUnitSeason.sourceUrl} target="_blank" rel="noreferrer">{powerUnitSeason.source}</a>.</p>
      </>}
    >
      <section className="season-section">
        <div className="season-scroll">
          <table className="season-table">
            <thead>
              <tr>
                <th>Piloto</th><th>Equipo</th><th>Motor</th>
                {elements.map((element) => <th key={element} className="num" title={elementLabels[element]}>{element}{allocation[element] ? <><br /><small>cupo {allocation[element]}</small></> : null}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((driver) => (
                <tr key={driver.number}>
                  <td>{driver.name} <small>#{driver.number}</small></td>
                  <td><TeamName id={driver.team} /></td>
                  <td className="muted">{driver.manufacturer}</td>
                  {driver.used.map((value, index) => {
                    const limit = allocation[elements[index]];
                    const over = limit !== undefined && value > limit;
                    return <td key={elements[index]} className="num"><span className={over ? "heat heat-over" : "heat"} title={over ? `${value - limit} por encima del cupo` : undefined}>{value}</span></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="season-section">
        <h2>Por fabricante</h2>
        <p className="season-lead">Elementos usados por encima del cupo, por auto.</p>
        <div className="season-scroll">
          <table className="season-table">
            <thead><tr><th>Fabricante</th><th className="num">Autos</th><th className="num">Elementos de más</th><th className="num">Por auto</th></tr></thead>
            <tbody>
              {manufacturers.map((row) => (
                <tr key={row.name}><td>{row.name}</td><td className="num">{row.cars}</td><td className="num">{row.over}</td><td className="num">{row.perCar.toLocaleString("es-AR", { maximumFractionDigits: 1 })}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SeasonShell>
  );
}
