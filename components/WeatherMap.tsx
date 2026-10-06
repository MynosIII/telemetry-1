"use client";
import { useState } from "react";
const layers = [{ id: "radar", label: "Radar" }, { id: "rain", label: "Lluvia" }, { id: "wind", label: "Viento" }, { id: "temp", label: "Temperatura" }, { id: "clouds", label: "Nubes" }];
export function WeatherMap({ latitude, longitude, name }: { latitude?: number; longitude?: number; name: string }) {
  const [layer, setLayer] = useState("radar");
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return <p>Mapa no disponible: faltan las coordenadas del circuito.</p>;
  const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude), detailLat: String(latitude), detailLon: String(longitude), zoom: "9", level: "surface", overlay: layer, product: "ecmwf", calendar: "now", metricWind: "km/h", metricTemp: "°C", detail: "true", marker: "true", message: "true" });
  return <section className="weather-box weather-map" aria-label="Mapa meteorológico">
    <h3>Mapa meteorológico · {name}</h3>
    <div className="weather-layers" role="group" aria-label="Capas del mapa">{layers.map(item => <button type="button" key={item.id} aria-pressed={layer === item.id} onClick={() => setLayer(item.id)}>{item.label}</button>)}<a href={`https://www.windy.com/?${layer},${latitude},${longitude},9`} target="_blank" rel="noreferrer">Abrir Windy ↗</a></div>
    <iframe key={layer} title={`${layers.find(item => item.id === layer)?.label} en ${name} — Windy`} src={`https://embed.windy.com/embed2.html?${params}`} loading="lazy" allowFullScreen />
    <p>Usá los controles de Windy para acercar el mapa y recorrer la animación. La cobertura del radar depende de la región.</p>
  </section>;
}
