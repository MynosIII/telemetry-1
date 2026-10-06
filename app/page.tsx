import Image from "@/components/ResilientImage";
import Link from "next/link";
import { ChampionshipForecast } from "@/components/ChampionshipForecast";
import { NextRacePanel } from "@/components/NextRacePanel";
import { RaceBoard } from "@/components/RaceBoard";
import { SearchArchive } from "@/components/SearchArchive";
import { GameGrid } from "@/components/GameGrid";
import { PredestinatoFeature } from "@/components/PredestinatoFeature";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StaleDataNotice } from "@/components/StaleDataNotice";
import { getF1HomeData } from "@/lib/f1-data";
import { enrichMarketForecast, getPolymarketChampionForecast, simulateChampionship } from "@/lib/championship-forecast";
import { getNextRaceModel } from "@/lib/race-weekend";
import { getHistoryIndex } from "@/lib/history";
import { getNews } from "@/lib/news";
import { NewsList } from "@/components/NewsList";
import eloRatings from "@/lib/elo-ratings.json";
import { driverPhoto } from "@/lib/driver-photos";

export default async function Home() {
  const [data, rawMarketForecast, historyIndex, news] = await Promise.all([
    getF1HomeData(),
    getPolymarketChampionForecast(),
    getHistoryIndex(),
    getNews(5)
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
            <Link className="button button-ghost" href="/juegos">IR A LOS JUEGOS <span>→</span></Link>
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
            <p className="eyebrow eyebrow-red">TEMPORADA</p>
            <h2 id="results-title">ÚLTIMAS <em>CARRERAS</em></h2>
          </div>
        </div>
        <RaceBoard races={data.races} />
        <div className="section-action"><Link className="button button-dark" href="/temporada">CLASIFICACIÓN Y PRONÓSTICO <span>→</span></Link></div>
      </section>

      {news.length ? (
        <section className="section section-light" id="noticias" aria-labelledby="news-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow eyebrow-red">NOTICIAS</p>
              <h2 id="news-title">LO ÚLTIMO DE LA <em>F1</em></h2>
            </div>
          </div>
          <NewsList items={news} compact />
          <div className="section-action"><Link className="button button-dark" href="/noticias">TODAS LAS NOTICIAS <span>→</span></Link></div>
        </section>
      ) : null}

      <section className="section archive-section" id="archivo" aria-labelledby="archive-title">
        <div className="section-heading heading-dark">
          <div>
            <p className="eyebrow eyebrow-yellow">ESTADÍSTICAS</p>
            <h2 id="archive-title">EXPLORÁ EL <em>ARCHIVO</em></h2>
          </div>
        </div>
        <SearchArchive portraits={{ senna: driverPhoto("senna"), hamilton: driverPhoto("hamilton"), antonelli: driverPhoto("antonelli") }} />
      </section>

      <section className="section section-light" id="ranking" aria-labelledby="stats-title">
        <div className="stats-layout">
          <div className="stats-copy">
            <p className="eyebrow eyebrow-red">MODELO V7.6</p>
            <h2 id="stats-title">RANKING <em>HISTÓRICO</em></h2>
            <p>
              Compará pilotos de distintas épocas con un modelo histórico que separa rendimiento,
              contexto del auto y dificultad de cada temporada.
            </p>
            <div className="stats-facts">
              <div><strong>75+</strong><span>TEMPORADAS</span></div>
              <div><strong>800+</strong><span>PILOTOS</span></div>
              <div><strong>1950</strong><span>DESDE</span></div>
            </div>
            <Link className="button button-dark" href="/ranking">VER EL RANKING <span>→</span></Link>
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
            <div className="chart-legend"><span><i /> ELO RETROSPECTIVO</span><span>ARCHIVO {historyIndex.meta.firstSeason} — {historyIndex.meta.lastSeason}</span></div>
          </figure>
        </div>
      </section>

      <PredestinatoFeature eyebrow="JUEGOS · MODO CARRERA" />

      <section className="section section-dark" id="juegos" aria-labelledby="games-title">
        <div className="section-heading heading-dark">
          <div>
            <p className="eyebrow eyebrow-yellow">PARTIDAS RÁPIDAS</p>
            <h2 id="games-title">MÁS <em>JUEGOS</em></h2>
          </div>
        </div>
        <GameGrid />
      </section>

      <SiteFooter />
    </main>
  );
}
