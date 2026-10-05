import Image from "@/components/ResilientImage";
import type { CircuitTopology } from "@/lib/circuit-topology";
import type { CircuitProfile } from "@/lib/types";

type Props = {
  circuit: CircuitProfile;
  topology?: CircuitTopology;
};

const countryCodes: Record<string, string> = {
  Australia: "AU", Azerbaijan: "AZ", Austria: "AT", Bahrain: "BH", Belgium: "BE",
  Brazil: "BR", Canada: "CA", China: "CN", Hungary: "HU", Italy: "IT", Japan: "JP",
  Malaysia: "MY", Mexico: "MX", Monaco: "MC", Netherlands: "NL", Qatar: "QA",
  Singapore: "SG", Spain: "ES", UAE: "AE", UK: "GB", USA: "US",
  "United Arab Emirates": "AE", "United Kingdom": "GB", "United States": "US"
};

const countryNames: Record<string, string> = {
  Australia: "Australia", Azerbaijan: "Azerbaiyán", Austria: "Austria", Bahrain: "Baréin",
  Belgium: "Bélgica", Brazil: "Brasil", Canada: "Canadá", China: "China", Hungary: "Hungría",
  Italy: "Italia", Japan: "Japón", Malaysia: "Malasia", Mexico: "México", Monaco: "Mónaco",
  Netherlands: "Países Bajos", Qatar: "Catar", Singapore: "Singapur", Spain: "España",
  UAE: "Emiratos Árabes Unidos", UK: "Reino Unido", USA: "Estados Unidos",
  "United Arab Emirates": "Emiratos Árabes Unidos", "United Kingdom": "Reino Unido",
  "United States": "Estados Unidos"
};

const flagFromCountry = (country: string) => {
  const code = countryCodes[country];
  return code ? String.fromCodePoint(...code.split("").map((letter) => 127397 + letter.charCodeAt(0))) : "🏁";
};

const number = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

function buildMapUrl(latitude: number, longitude: number) {
  const latitudeSpan = 0.075;
  const longitudeSpan = 0.11;
  const bbox = [
    longitude - longitudeSpan,
    latitude - latitudeSpan,
    longitude + longitudeSpan,
    latitude + latitudeSpan
  ].join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

export function CircuitIntelligence({ circuit, topology }: Props) {
  const countryCode = countryCodes[circuit.country]?.toLowerCase();
  const countryName = countryNames[circuit.country] ?? circuit.country;
  const hasCoordinates = Number.isFinite(circuit.latitude) && Number.isFinite(circuit.longitude);
  const mapLink = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${circuit.latitude}&mlon=${circuit.longitude}#map=13/${circuit.latitude}/${circuit.longitude}`
    : undefined;

  return (
    <section className="circuit-intelligence" aria-labelledby="circuit-intelligence-title">
      <div className="detail-heading circuit-intelligence-heading">
        <div>
          <p className="eyebrow eyebrow-red">CONOCER EL CIRCUITO</p>
          <h2 id="circuit-intelligence-title">RADIOGRAFÍA DEL <em>TRAZADO</em></h2>
        </div>
      </div>

      <div className="circuit-story-grid">
        <article className="circuit-story-card speed-card">
          <div className="circuit-country-line">
            {countryCode ? (
              <img className="country-flag" src={`https://flagcdn.com/${countryCode}.svg`} alt={`Bandera de ${countryName}`} width="52" height="35" />
            ) : (
              <span className="country-flag country-flag-fallback" role="img" aria-label={`Bandera de ${countryName}`}>
                {flagFromCountry(circuit.country)}
              </span>
            )}
            <div><small>PAÍS · HISTORIA</small><strong>{countryName}</strong></div>
          </div>
          <p>{circuit.history ?? circuit.description}</p>
          {circuit.wikipediaUrl ? (
            <a href={circuit.wikipediaUrl} target="_blank" rel="noreferrer">
              LEER EN WIKIPEDIA {circuit.historySourceLanguage === "es" ? "EN ESPAÑOL" : ""} ↗
            </a>
          ) : null}
        </article>

        <article className="lap-record-card speed-card">
          <p>RÉCORD DE VUELTA</p>
          {circuit.lapRecord ? (
            <>
              <strong>{circuit.lapRecord.time}</strong>
              <h3>{circuit.lapRecord.driver}</h3>
              <span>{[circuit.lapRecord.car, circuit.lapRecord.year].filter(Boolean).join(" · ")}</span>
              {circuit.lapRecord.averageSpeedKph ? (
                <div className="record-speed">
                  <small>VELOCIDAD MEDIA DE LA VUELTA</small>
                  <b>{number.format(circuit.lapRecord.averageSpeedKph)} KM/H</b>
                </div>
              ) : null}
            </>
          ) : (
            <div className="record-unavailable">
              <strong>—</strong>
              <p>Récord no disponible.</p>
            </div>
          )}
        </article>
      </div>

      <div className="circuit-map-grid">
        <article className="location-card speed-card">
          <div className="card-label"><span>UBICACIÓN</span><b>{circuit.locality}</b></div>
          {hasCoordinates ? (
            <>
              <iframe
                title={`Mapa de ${circuit.name}`}
                src={buildMapUrl(circuit.latitude!, circuit.longitude!)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="map-meta">
                <a href={mapLink} target="_blank" rel="noreferrer">ABRIR MAPA ↗</a>
              </div>
            </>
          ) : <p className="topology-empty">Coordenadas no disponibles para este trazado.</p>}
        </article>

        <article className="track-shape-card speed-card">
          <div className="card-label"><span>FORMA DEL CIRCUITO</span></div>
          {topology ? (
            <>
              <div className="track-shape-image">
                <Image src={topology.mapImage} alt={`Topología de ${circuit.name}`} fill sizes="(max-width: 900px) 100vw, 50vw" unoptimized />
              </div>
              <div className="map-meta">
                <a href={topology.mapImage} target="_blank" rel="noreferrer">CRÉDITOS DE LA IMAGEN ↗</a>
              </div>
            </>
          ) : (
            <div className="topology-empty">
              <b>TRAZADO NO DISPONIBLE</b>
              <p>Todavía no tenemos la imagen de este circuito.</p>
            </div>
          )}
        </article>
      </div>

      {topology ? (
        <div className="topology-facts" aria-label="Datos del circuito">
          <div><span>CURVAS</span><strong>{topology.turnCount}</strong></div>
          <div><span>RECTA MÁS LARGA</span><strong>{number.format(topology.longestStraightM)} M</strong></div>
          <div><span>CHICANAS Y ESSES</span><strong>{topology.chicaneCount + topology.essesCount}</strong></div>
        </div>
      ) : null}
    </section>
  );
}
