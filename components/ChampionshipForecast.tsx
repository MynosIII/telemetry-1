import Link from "next/link";
import type { ForecastDriver, MarketForecast, ModelForecast } from "@/lib/championship-forecast";

const probability = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

const compactCurrency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1
});

function ForecastRanking({ entries, kind }: { entries: ForecastDriver[]; kind: "market" | "model" }) {
  return (
    <ol className="forecast-ranking">
      {entries.map((entry, index) => (
        <li key={entry.name}>
          <span className="forecast-position">{String(index + 1).padStart(2, "0")}</span>
          <div className="forecast-driver">
            <strong>{entry.href ? <Link href={entry.href}>{entry.name}</Link> : entry.name}</strong>
            <span>{entry.team ?? (kind === "market" ? "MERCADO" : "FÓRMULA 1")}</span>
          </div>
          <div className="forecast-bar" aria-hidden="true"><i style={{ width: `${Math.max(1, entry.probability)}%` }} /></div>
          <b>{probability.format(entry.probability)}%</b>
          {kind === "model" && <small>{entry.projectedPoints} PTS</small>}
        </li>
      ))}
    </ol>
  );
}

export function ChampionshipForecast({ market, model }: { market: MarketForecast; model: ModelForecast }) {
  return (
    <section className="section championship-forecast" id="simulacion" aria-labelledby="forecast-title">
      <div className="section-heading forecast-heading">
        <div>
          <p className="eyebrow eyebrow-red">DOS LECTURAS DEL TÍTULO</p>
          <h2 id="forecast-title">SIMULACIÓN DEL <em>CAMPEONATO</em></h2>
        </div>
      </div>

      <div className="forecast-grid">
        <article className="forecast-panel market-panel">
          <header>
            <div><span>01</span><p>PROBABILIDAD DE MERCADO</p></div>
            <h3>POLYMARKET</h3>
          </header>
          {market.available ? (
            <>
              <ForecastRanking entries={market.entries} kind="market" />
              <div className="forecast-panel-footer">
                <span>{market.volume ? `${compactCurrency.format(market.volume)} NEGOCIADOS` : "MERCADO ACTIVO"}</span>
                <a href={market.eventUrl} target="_blank" rel="noreferrer">ABRIR MERCADO ↗</a>
              </div>
            </>
          ) : (
            <div className="forecast-unavailable">
              <strong>MERCADO NO DISPONIBLE</strong>
              <p>La proyección estadística sigue funcionando mientras se recupera la conexión.</p>
            </div>
          )}
        </article>

        <article className="forecast-panel model-panel">
          <header>
            <div><span>02</span><p>PROYECCIÓN TELEMETRY 1</p></div>
          </header>
          <ForecastRanking entries={model.entries} kind="model" />
          <div className="forecast-panel-footer">
            <span>{model.remainingRaces} CARRERAS RESTANTES</span>
          </div>
        </article>
      </div>

      <div className="next-winners" aria-label="Favoritos para las próximas carreras">
        <p>PRÓXIMAS CARRERAS</p>
        <div>
          {model.nextRaces.map((race) => (
            <article key={race.round}>
              <span>R{race.round.padStart(2, "0")}</span>
              <strong>{race.name}</strong>
              <p>{race.favorite}</p>
              <b>{probability.format(race.probability)}%</b>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
