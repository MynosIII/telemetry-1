import Image from "@/components/ResilientImage";
import Link from "next/link";
import { formatSession } from "@/lib/format";
import type { RaceWeekendData } from "@/lib/race-weekend";
import type { CircuitProfile, ScheduledRace } from "@/lib/types";

const probability = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function WeatherMark({ code }: { code: number }) {
  const mark = code >= 95 ? "↯" : code >= 51 ? "///" : code >= 1 ? "☁" : "☀";
  return <span className="weekend-weather-mark" aria-hidden="true">{mark}</span>;
}

function PredictionList({ entries, showForm = false }: { entries: RaceWeekendData["model"]["entries"]; showForm?: boolean }) {
  const maximum = entries[0]?.probability || 1;
  return (
    <ol className="weekend-prediction-list">
      {entries.map((entry, index) => (
        <li key={entry.driverId}>
          <span className="weekend-rank">{String(index + 1).padStart(2, "0")}</span>
          <span className="weekend-driver-photo">
            {entry.image ? <Image src={entry.image} alt="" fill sizes="42px" unoptimized /> : entry.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="weekend-driver-name">
            <strong><Link href={`/pilotos/${entry.driverId}`}>{entry.name}</Link></strong>
            <span>{entry.team}</span>
            {showForm && <small>{entry.form.map((result, formIndex) => <i className={result === "DNF" ? "is-dnf" : ""} key={`${result}-${formIndex}`}>{result}</i>)}</small>}
          </div>
          <div className="weekend-probability" aria-hidden="true"><i style={{ width: `${entry.probability / maximum * 100}%` }} /></div>
          <b>{probability.format(entry.probability)}%</b>
        </li>
      ))}
    </ol>
  );
}

export function RaceWeekendHub({ race, circuit, data }: { race: ScheduledRace; circuit: CircuitProfile; data: RaceWeekendData }) {
  return (
    <section className="race-weekend-hub" id="previa" aria-labelledby="weekend-title">
      <div className="weekend-heading">
        <div>
          <p className="eyebrow eyebrow-red">PRÓXIMA CARRERA · RONDA {race.round}</p>
          <h2 id="weekend-title">PREVIA DE <em>{circuit.locality}</em></h2>
        </div>
        <Link className="button button-dark" href="/en-vivo"><span className="live-dot" />ABRIR CENTRO EN VIVO →</Link>
      </div>

      <div className="weekend-weather-panel">
        <header>
          <div><span>01</span><p>CLIMA DEL FIN DE SEMANA</p></div>
          <strong>{circuit.locality.toUpperCase()}</strong>
        </header>
        {data.weather.available ? (
          <div className="weekend-weather-grid">
            {data.weather.sessions.map((session) => {
              const local = formatSession({ key: session.key, label: session.label, date: session.startsAt.slice(0, 10), time: session.startsAt.slice(11) }, circuit.timezone);
              return (
                <article key={session.key}>
                  <span>{local.day} · {local.time}</span>
                  <WeatherMark code={session.weatherCode} />
                  <h3>{session.label}</h3>
                  <p>{session.condition}</p>
                  <div><strong>{Math.round(session.temperature)}°</strong><b>{Math.round(session.rainProbability)}% lluvia</b></div>
                  <small>VIENTO {Math.round(session.windSpeed)} KM/H</small>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="weekend-empty"><strong>PRONÓSTICO TODAVÍA NO DISPONIBLE</strong><p>Aparecerá cuando el fin de semana entre en el rango meteorológico.</p></div>
        )}
      </div>

      <div className="weekend-forecast-grid">
        <article className="weekend-forecast-card">
          <header><div><span>02</span><p>PROBABILIDAD DE MERCADO</p></div><strong>POLYMARKET</strong></header>
          {data.market.available ? (
            <>
              <PredictionList entries={data.market.entries} />
              <footer><span>MERCADO ACTIVO</span><a href={data.market.eventUrl} target="_blank" rel="noreferrer">ABRIR MERCADO ↗</a></footer>
            </>
          ) : (
            <div className="weekend-empty market-empty"><strong>NO HAY MERCADO PARA ESTA CARRERA</strong><p>Se mostrará automáticamente cuando Polymarket publique un mercado de ganador.</p></div>
          )}
        </article>

        <article className="weekend-forecast-card model-race-card">
          <header><div><span>03</span><p>PRONÓSTICO TELEMETRY 1</p></div><strong>FORMA RECIENTE</strong></header>
          <PredictionList entries={data.model.entries} showForm />
        </article>
      </div>

      <Link className="weekend-live-bridge" href="/en-vivo">
        <div><span className="live-dot" /><b>EN VIVO</b></div>
        <strong>POSICIONES · INTERVALOS · VUELTAS · NEUMÁTICOS · DIRECCIÓN DE CARRERA</strong>
        <em>ENTRAR →</em>
      </Link>
    </section>
  );
}
