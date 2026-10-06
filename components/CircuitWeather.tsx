import { getCircuitWeather } from "@/lib/circuit-weather";
import type { CircuitProfile } from "@/lib/types";
import { WeatherMap } from "./WeatherMap";

const value = (v: number | null | undefined, suffix = "") => typeof v === "number" && Number.isFinite(v) ? `${v.toLocaleString("es-AR", { maximumFractionDigits: 1 })}${suffix}` : "—";
function condition(code: number | null | undefined) {
  if (code === 0) return ["☀", "Despejado"];
  if (code === 1 || code === 2) return ["◐", "Parcialmente nublado"];
  if (code === 3) return ["☁", "Cubierto"];
  if (code === 45 || code === 48) return ["≋", "Niebla"];
  if (code != null && code >= 51 && code <= 57) return ["☂", "Llovizna"];
  if (code != null && code >= 61 && code <= 67) return ["☂", "Lluvia"];
  if (code != null && code >= 71 && code <= 77 || code === 85 || code === 86) return ["❄", "Nieve"];
  if (code != null && code >= 80 && code <= 82) return ["☂", "Chaparrones"];
  if (code != null && code >= 95 && code <= 99) return ["ϟ", "Tormenta"];
  return ["—", "Sin registro"];
}
export async function CircuitWeather({ circuit, raceDate }: { circuit: CircuitProfile; raceDate?: string }) {
  const data = await getCircuitWeather(circuit.latitude, circuit.longitude);
  const time = (timestamp: number | null | undefined, options: Intl.DateTimeFormatOptions) => typeof timestamp === "number" ? new Intl.DateTimeFormat("es-AR", { ...options, timeZone: data?.timezone ?? "UTC" }).format(new Date(timestamp * 1000)) : "—";
  const current = data?.current;
  const hourIndex = data ? data.hourly.time.findIndex(t => t >= data.current.time - 3600 && t <= data.current.time) : -1;
  const direction = current?.wind_direction_10m == null ? "—" : ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(current.wind_direction_10m / 45) % 8];
  const stats = current ? [
    ["Temperatura", value(current.temperature_2m, "°C"), `Sensación ${value(current.apparent_temperature, "°C")}`],
    ["Humedad", value(current.relative_humidity_2m, "%"), condition(current.weather_code)[1]],
    ["Viento", value(current.wind_speed_10m, " km/h"), `Ráfagas ${value(current.wind_gusts_10m, " km/h")} · ${direction}`],
    ["Precipitación", value(current.precipitation, " mm"), `Durante los últimos ${value(current.interval / 60)} minutos`],
    ["Presión", value(current.pressure_msl, " hPa"), "Al nivel del mar"],
    ["Índice UV", value(data?.hourly.uv_index[hourIndex]), "Estimación horaria"],
  ] : [];
  return <section id="clima" className="circuit-weather" aria-labelledby="weather-title">
    <header className="weather-heading"><div><p className="eyebrow eyebrow-red">METEOROLOGÍA</p><h2 id="weather-title">CLIMA <em>EN PISTA</em></h2><p>{circuit.name} · {circuit.locality}, {circuit.country}</p></div><a href={`/en-vivo/clima?circuito=${encodeURIComponent(circuit.id)}`}>Elegir circuito ↗</a></header>
    {data ? <section className="weather-box"><h3>Condiciones actuales estimadas <span>{time(data.current.time, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {data.timezone}</span></h3><dl className="weather-current">{stats.map(([label, v, note]) => <div key={label}><dt>{label}</dt><dd>{v}</dd><small>{note}</small></div>)}</dl></section> : <p className="weather-unavailable" role="status">El pronóstico no está disponible en este momento. Podés consultar el mapa o volver a cargar esta página.</p>}
    <WeatherMap latitude={circuit.latitude} longitude={circuit.longitude} name={circuit.name} />
    {data ? <div className="weather-forecasts">
      <section className="weather-box"><h3>Pronóstico de 7 días</h3><table className="weather-days"><thead><tr><th>Día</th><th>Estado</th><th>Máx. / mín.</th><th>Lluvia</th></tr></thead><tbody>{data.daily.time.map((t, i) => {
        const local = new Intl.DateTimeFormat("en-CA", { timeZone: data.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t * 1000));
        const isRace = local === raceDate;
        const [icon, label] = condition(data.daily.weather_code[i]);
        return <tr key={t} className={isRace ? "is-race" : ""}><th scope="row">{time(t, { weekday: "short", day: "numeric" })}{isRace ? <small>CARRERA</small> : null}</th><td><span aria-hidden="true">{icon}</span> {label}</td><td>{value(data.daily.temperature_2m_max[i], "°")} / {value(data.daily.temperature_2m_min[i], "°")}</td><td>{value(data.daily.precipitation_probability_max[i], "%")}</td></tr>;
      })}</tbody></table></section>
      <section className="weather-box"><h3>Próximas 24 horas <span>Deslizá para ver más →</span></h3><div className="weather-hours" tabIndex={0} role="region" aria-label="Pronóstico por hora, desplazamiento horizontal">{data.hourly.time.map((t, i) => ({ t, i })).filter(({ t }) => t >= data.current.time).slice(0, 24).map(({ t, i }) => {
        const [icon, label] = condition(data.hourly.weather_code[i]);
        return <article key={t}><time dateTime={new Date(t * 1000).toISOString()}>{time(t, { hour: "2-digit", minute: "2-digit" })}</time><span className="weather-symbol" aria-label={label} title={label}>{icon}</span><strong>{value(data.hourly.temperature_2m[i], "°")}</strong><span className="weather-rain">{value(data.hourly.precipitation_probability[i], "%")}</span><small>{value(data.hourly.precipitation[i], " mm")}</small><small>{value(data.hourly.wind_speed_10m[i], " km/h")}</small></article>;
      })}</div><p className="weather-explanation">Porcentaje: probabilidad de precipitación. Milímetros: cantidad prevista por hora. Horarios locales del circuito.</p></section>
    </div> : null}
    <section className="weather-box weather-sources"><h3>Fuentes y horarios</h3><p>Condiciones y pronósticos: <a href="https://open-meteo.com/">Open-Meteo</a>, con caché de 10 minutos. Son estimaciones meteorológicas, independientes de los sensores de pista de F1. Mapa: <a href="https://www.windy.com/">Windy</a>.</p>{data ? <dl><div><dt>Amanecer de hoy</dt><dd>{time(data.daily.sunrise[0], { hour: "2-digit", minute: "2-digit" })}</dd></div><div><dt>Atardecer de hoy</dt><dd>{time(data.daily.sunset[0], { hour: "2-digit", minute: "2-digit" })}</dd></div><div><dt>Zona horaria</dt><dd>{data.timezone}</dd></div></dl> : null}</section>
  </section>;
}
