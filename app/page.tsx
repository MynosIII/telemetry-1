import Image from "@/components/ResilientImage";
import Link from "next/link";
import { ChampionshipForecast } from "@/components/ChampionshipForecast";
import { NextRacePanel } from "@/components/NextRacePanel";
import { RaceBoard } from "@/components/RaceBoard";
import { SearchArchive } from "@/components/SearchArchive";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StaleDataNotice } from "@/components/StaleDataNotice";
import { getF1HomeData } from "@/lib/f1-data";
import { enrichMarketForecast, getPolymarketChampionForecast, simulateChampionship } from "@/lib/championship-forecast";
import { getNextRaceModel } from "@/lib/race-weekend";
import { getHistoryIndex } from "@/lib/history";
import eloRatings from "@/lib/elo-ratings.json";

const games = [
  {
    number: "01",
    label: "IDENTIDAD",
    title: "¿Quién es el piloto?",
    copy: "Descubrí al piloto con pistas de su carrera y estadísticas.",
    meta: "HISTORIA F1 · PISTAS POR INTENTO",
    href: "/juegos/piloto",
    accent: "red"
  },
  {
    number: "02",
    label: "GEOMETRÍA",
    title: "Adiviná el circuito",
    copy: "Reconocé trazados de todas las épocas por su silueta y sus curvas.",
    meta: "SILUETAS · TRES MODOS",
    href: "/juegos/circuito",
    accent: "yellow"
  },
  {
    number: "03",
    label: "ESTADÍSTICAS",
    title: "Higher or Lower",
    copy: "Elegí qué piloto tiene más victorias. Una racha, cero margen de error.",
    meta: "DUELO · RÉCORD PERSONAL",
    href: "/juegos/higher-lower",
    accent: "blue"
  },
  {
    number: "04",
    label: "DESAFÍO",
    title: "F1 Bingo",
    copy: "Completá la grilla con pilotos que cumplan cada condición histórica.",
    meta: "LÓGICA · ARCHIVO COMPLETO",
    href: "/juegos/bingo",
    accent: "green"
  }
];

export default async function Home() {
  const [data, rawMarketForecast, historyIndex] = await Promise.all([
    getF1HomeData(),
    getPolymarketChampionForecast(),
    getHistoryIndex()
  ]);
  // The model's differentiator on the home page: the v7.6 career ELO of the highest-rated drivers.
  const eloLeaders = Object.entries(eloRatings as Record<string, { name: string; careerRating: number }>)
    .map(([id, rating]) => ({ id, ...rating }))
    .sort((a, b) => b.careerRating - a.careerRating)
    .slice(0, 8);
  const eloHigh = Math.ceil((eloLeaders[0]?.careerRating ?? 2000) / 50) * 50;
  const eloLow = Math.floor(((eloLeaders.at(-1)?.careerRating ?? 1500) - 100) / 100) * 100;
  const marketForecast = enrichMarketForecast(rawMarketForecast, data.standings);
  // The snapshot only knows one weekend, so a simulation on it would be meaningless.
  const seasonForecast = data.live ? simulateChampionship(data) : undefined;
  // Show the circuit page's next-race model for the next round so both pages agree.
  const nextRaceModel = seasonForecast && data.nextRace.state === "next"
    ? await getNextRaceModel(data.nextRace, data.standings)
    : undefined;
  const modelForecast = seasonForecast && nextRaceModel?.[0] ? {
    ...seasonForecast,
    nextRaces: seasonForecast.nextRaces.map((race) => race.round === data.nextRace.round
      ? { ...race, favorite: nextRaceModel[0].name, probability: nextRaceModel[0].probability }
      : race)
  } : seasonForecast;
  const leader = data.standings[0];

  return (
    <main id="top">
      <SiteHeader />
      <StaleDataNotice live={data.live} />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-speed-lines" aria-hidden="true" />
        <div className="hero-copy">
          <p className="hero-kicker"><span /> TU PADDOCK DIGITAL</p>
          <h1 id="hero-title">TODO EL MUNDO DE LA <em>FÓRMULA 1</em></h1>
          <p className="hero-lede">
            Resultados, juegos, estadísticas e historias. Una sola línea de largada
            para vivir y entender la máxima categoría.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#resultados">VER ÚLTIMOS RESULTADOS <span>↘</span></a>
            <a className="button button-ghost" href="#juegos">IR A LOS JUEGOS <span>→</span></a>
          </div>
        </div>

        <div className="hero-dashboard" aria-label="Resumen de la temporada">
          <p>CAMPEONATO DE PILOTOS</p>
          <div className="leader-card">
            <span className="leader-rank">01</span>
            {leader?.image && (
              <div className="leader-image">
                <Image src={leader.image} alt={leader.name} fill sizes="260px" unoptimized priority />
              </div>
            )}
            <div className="leader-data">
              <small>LÍDER ACTUAL</small>
              <h2>{leader ? <Link href={`/pilotos/${leader.driverId}`}>{leader.name}</Link> : "Campeonato"}</h2>
              <span>{leader?.team}</span>
              <strong>{leader?.points}<small> PTS</small></strong>
            </div>
          </div>
          <div className="mini-standings">
            {data.standings.slice(1, 5).map((standing) => (
              <Link href={`/pilotos/${standing.driverId}`} key={standing.name}>
                <b>{standing.position.padStart(2, "0")}</b>
                <span>{standing.name}</span>
                <strong>{standing.points}</strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <NextRacePanel race={data.nextRace} circuit={data.nextCircuit} />

      <ChampionshipForecast market={marketForecast} model={modelForecast} />

      <section className="section section-light" id="resultados" aria-labelledby="results-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow-red">ACTUALIDAD</p>
            <h2 id="results-title">ÚLTIMAS <em>CARRERAS</em></h2>
          </div>
        </div>
        <RaceBoard races={data.races} />
        <div className="section-action"><Link className="button button-dark" href="/calendario">VER TEMPORADA COMPLETA <span>→</span></Link></div>
      </section>

      <section className="section section-dark" id="juegos" aria-labelledby="games-title">
        <div className="section-heading heading-dark">
          <div>
            <p className="eyebrow eyebrow-yellow">PONÉ A PRUEBA LO QUE SABÉS</p>
            <h2 id="games-title">JUEGOS DE <em>F1</em></h2>
          </div>
        </div>
        <div className="game-grid">
          {games.map((game) => (
            <Link className={`game-card game-${game.accent}`} href={game.href} key={game.title}>
              <div className="game-topline"><span>{game.number}</span><b>{game.label}</b></div>
              <div className="game-glyph" aria-hidden="true">{game.number === "02" ? "⌁" : game.number === "03" ? "↕" : game.number === "04" ? "▦" : "?"}</div>
              <h3>{game.title}</h3>
              <p>{game.copy}</p>
              <div className="game-footer"><span>{game.meta}</span><b>JUGAR →</b></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="predestinato" id="predestinato" aria-labelledby="predestinato-title">
        <div className="predestinato-copy">
          <p className="eyebrow eyebrow-yellow">MODO CARRERA</p>
          <h2 id="predestinato-title">EL <em>PREDESTINADO</em></h2>
          <p className="predestinato-lede">
            Tomá las decisiones dentro y fuera de la pista. Construí una carrera desde el karting,
            ganá prestigio, gestioná tu equipo y escribí tu propia historia.
          </p>
          <ul>
            <li><span>01</span> Carrera y progresión</li>
            <li><span>02</span> Decisiones y consecuencias</li>
            <li><span>03</span> Temporadas, rivales y legado</li>
          </ul>
          <a className="button button-yellow" href="/predestinato">ENTRAR AL JUEGO <span>→</span></a>
        </div>
        <div className="predestinato-panel" aria-hidden="true">
          <div className="career-header"><span>EJEMPLO DE PARTIDA · TEMPORADA 01</span><b>PRESTIGIO 68</b></div>
          <div className="career-stage">
            <span className="stage-number">07</span>
            <p>PRÓXIMO OBJETIVO</p>
            <h3>GANÁ TU LUGAR EN LA PARRILLA</h3>
            <div className="progress"><i /></div>
            <small>68 / 100 REPUTACIÓN</small>
          </div>
          <div className="career-cards">
            <div><span>ESTADO</span><b>EN ASCENSO</b></div>
            <div><span>PRÓXIMA CITA</span><b>MONZA</b></div>
            <div><span>RIVAL</span><b>A. MORETTI</b></div>
          </div>
        </div>
      </section>

      <section className="section section-light" id="estadisticas" aria-labelledby="stats-title">
        <div className="stats-layout">
          <div className="stats-copy">
            <p className="eyebrow eyebrow-red">LABORATORIO DE RENDIMIENTO</p>
            <h2 id="stats-title">TELEMETRY <em>ONE</em></h2>
            <p>
              Compará pilotos de distintas épocas con un modelo histórico que separa rendimiento,
              contexto del auto y dificultad de cada temporada.
            </p>
            <div className="stats-facts">
              <div><strong>75+</strong><span>TEMPORADAS</span></div>
              <div><strong>800+</strong><span>PILOTOS</span></div>
              <div><strong>1950</strong><span>DESDE</span></div>
            </div>
            <a className="button button-dark" href="/estadisticas">ABRIR ESTADÍSTICAS <span>→</span></a>
          </div>
          <figure className="telemetry-chart">
            <figcaption className="chart-head"><span>COMPARACIÓN HISTÓRICA · MODELO V7.6</span><b>RATING ELO DE CARRERA</b></figcaption>
            <div className="chart-area">
              <div className="chart-y" aria-hidden="true">{[1, .75, .5, .25, 0].map((share) => <span key={share}>{Math.round(eloLow + (eloHigh - eloLow) * share)}</span>)}</div>
              <ol className="chart-bars">
                {eloLeaders.map((driver) => (
                  <li key={driver.id}>
                    <Link href={`/pilotos/${driver.id}`} aria-label={`${driver.name}: ELO ${Math.round(driver.careerRating)}`}>
                      <b>{Math.round(driver.careerRating)}</b>
                      <i style={{ height: `${(driver.careerRating - eloLow) / (eloHigh - eloLow) * 100}%` }} />
                      <small>{driver.name.replace(/ Jr\.$/, "").split(" ").at(-1)}</small>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
            <div className="chart-legend"><span><i /> ELO RETROSPECTIVO · <Link href="/estadisticas/laboratorio">VER EL LABORATORIO →</Link></span><span>ARCHIVO {historyIndex.meta.firstSeason} — {historyIndex.meta.lastSeason}</span></div>
          </figure>
        </div>
      </section>

      <section className="section archive-section" id="archivo" aria-labelledby="archive-title">
        <div className="section-heading heading-dark">
          <div>
            <p className="eyebrow eyebrow-yellow">INFORMACIÓN</p>
            <h2 id="archive-title">EXPLORÁ EL <em>ARCHIVO</em></h2>
          </div>
        </div>
        <SearchArchive />
      </section>

      <SiteFooter />
    </main>
  );
}
