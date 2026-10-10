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
import { useTranslation } from "@/lib/i18n";
import { getLang } from "@/lib/server-i18n";
import { editorialArticles } from "@/lib/editorial-articles";
import "./articles.css";
import { OnThisDay } from "@/components/OnThisDay";

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
  const lang = await getLang();
  const t = useTranslation(lang);

  return (
    <main id="top">
      <SiteHeader />
      <StaleDataNotice live={data.live} />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-speed-lines" aria-hidden="true" />
        <div className="hero-copy">
          <p className="hero-kicker"><span /> {t("hero.kicker")}</p>
          <h1 id="hero-title" dangerouslySetInnerHTML={{ __html: t("hero.title") }} />
          <p className="hero-lede">{t("hero.lede")}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#resultados">{t("hero.btn.results")} <span>↘</span></a>
            <Link className="button button-ghost" href="/juegos">{t("hero.btn.games")} <span>→</span></Link>
          </div>
        </div>

        <div className="hero-dashboard" aria-label="Resumen de la temporada">
          <p>{t("dashboard.title")}</p>
          <div className="leader-card">
            <span className="leader-rank">01</span>
            {leader?.image && (
              <div className="leader-image">
                <Image src={leader.image} alt={leader.name} fill sizes="260px" unoptimized priority />
              </div>
            )}
            <div className="leader-data">
              <small>{t("dashboard.leader")}</small>
              <h2>{leader ? <Link href={`/pilotos/${leader.driverId}`}>{leader.name}</Link> : t("dashboard.champ")}</h2>
              <span>{leader?.team}</span>
              <strong>{leader?.points}<small> {t("dashboard.pts")}</small></strong>
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

      <OnThisDay />

      <ChampionshipForecast market={marketForecast} model={modelForecast} />

      <section className="section section-light" id="resultados" aria-labelledby="results-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow-red">{t("results.eyebrow")}</p>
            <h2 id="results-title" dangerouslySetInnerHTML={{ __html: t("results.title") }} />
          </div>
        </div>
        <RaceBoard races={data.races} />
        <div className="section-action"><Link className="button button-dark" href="/temporada">{t("results.btn")} <span>→</span></Link></div>
      </section>

      {news.length ? (
        <section className="section section-light" id="noticias" aria-labelledby="news-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow eyebrow-red">{t("news.eyebrow")}</p>
              <h2 id="news-title" dangerouslySetInnerHTML={{ __html: t("news.title") }} />
            </div>
          </div>
          <NewsList items={news} compact />
          <div className="section-action"><Link className="button button-dark" href="/noticias">{t("news.btn")} <span>→</span></Link></div>
        </section>
      ) : null}

      <section className="section archive-section" id="archivo" aria-labelledby="archive-title">
        <div className="section-heading heading-dark">
          <div>
            <p className="eyebrow eyebrow-yellow">{t("archive.eyebrow")}</p>
            <h2 id="archive-title" dangerouslySetInnerHTML={{ __html: t("archive.title") }} />
          </div>
        </div>
        <SearchArchive portraits={{ senna: driverPhoto("senna"), hamilton: driverPhoto("hamilton"), antonelli: driverPhoto("antonelli") }} />
      </section>

      <section className="section section-light" id="ranking" aria-labelledby="stats-title">
        <div className="stats-layout">
          <div className="stats-copy">
            <p className="eyebrow eyebrow-red">{t("ranking.eyebrow")}</p>
            <h2 id="stats-title" dangerouslySetInnerHTML={{ __html: t("ranking.title") }} />
            <p>{t("ranking.desc")}</p>
            <div className="stats-facts">
              <div><strong>75+</strong><span>{t("ranking.fact.seasons")}</span></div>
              <div><strong>800+</strong><span>{t("ranking.fact.drivers")}</span></div>
              <div><strong>1950</strong><span>{t("ranking.fact.since")}</span></div>
            </div>
            <Link className="button button-dark" href="/ranking">{t("ranking.btn")} <span>→</span></Link>
          </div>
          <figure className="telemetry-chart">
            <figcaption className="chart-head"><span>{t("ranking.chart.head")}</span><b>{t("ranking.chart.sub")}</b></figcaption>
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
            <div className="chart-legend"><span><i /> {t("ranking.chart.retro")}</span><span>{t("ranking.chart.archive")} {historyIndex.meta.firstSeason} - {historyIndex.meta.lastSeason}</span></div>
          </figure>
        </div>
      </section>

      <section className="editorial-more editorial-home" aria-labelledby="home-articles-title">
        <p className="eyebrow eyebrow-red">LA BIBLIOTECA DE TELEMETRY ONE</p>
        <h2 id="home-articles-title">Las ideas detrás de la velocidad</h2>
        <p>De las primeras carreras al efecto suelo y los límites del reglamento: historias para entender cómo cambió el automovilismo.</p>
        <div className="editorial-card-grid">{["san-martin-villa-martelli", "mclaren-mp4-1", "niza-semana-velocidad"].flatMap(slug => editorialArticles.filter(article => article.slug === slug)).map(article => <Link className="editorial-card" href={`/articulos/${article.slug}`} key={article.slug}><p className="editorial-category">{article.category} · {article.period}</p><h3>{article.title}</h3><p>{article.description}</p><b>Leer historia →</b></Link>)}</div>
        <p><Link className="editorial-text-link" href="/articulos">Ver todos los artículos →</Link></p>
      </section>

      <PredestinatoFeature eyebrow={t("games.career")} />

      <section className="section section-dark" id="juegos" aria-labelledby="games-title">
        <div className="section-heading heading-dark">
          <div>
            <p className="eyebrow eyebrow-yellow">{t("games.eyebrow")}</p>
            <h2 id="games-title" dangerouslySetInnerHTML={{ __html: t("games.title") }} />
          </div>
        </div>
        <GameGrid />
      </section>

      <SiteFooter />
    </main>
  );
}
