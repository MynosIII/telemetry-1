import { cookies } from "next/headers";

export const uiDict = {
  es: {
    "nav.home": "Inicio",
    "nav.news": "Noticias",
    "nav.season": "Temporada",
    "nav.races": "Carreras",
    "nav.archive": "Archivo",
    "nav.history": "Historia",
    "nav.games": "Juegos",
    "nav.live": "En vivo",
    
    "hero.kicker": "TU PADDOCK DIGITAL",
    "hero.title": "TODO EL MUNDO DE LA <em>FÓRMULA 1</em>",
    "hero.lede": "Resultados, juegos, estadísticas e historias. Una sola línea de largada para vivir y entender la máxima categoría.",
    "hero.btn.results": "VER ÚLTIMOS RESULTADOS",
    "hero.btn.games": "IR A LOS JUEGOS",
    
    "dashboard.title": "CAMPEONATO DE PILOTOS",
    "dashboard.leader": "LÍDER ACTUAL",
    "dashboard.champ": "Campeonato",
    "dashboard.pts": "PTS",
    
    "results.eyebrow": "TEMPORADA",
    "results.title": "ÚLTIMAS <em>CARRERAS</em>",
    "results.btn": "CLASIFICACIÓN Y PRONÓSTICO",
    
    "news.eyebrow": "NOTICIAS",
    "news.title": "LO ÚLTIMO DE LA <em>F1</em>",
    "news.btn": "TODAS LAS NOTICIAS",
    
    "archive.eyebrow": "ESTADÍSTICAS",
    "archive.title": "EXPLORÁ EL <em>ARCHIVO</em>",
    
    "ranking.eyebrow": "MODELO V7.6",
    "ranking.title": "RANKING <em>HISTÓRICO</em>",
    "ranking.desc": "Compará pilotos de distintas épocas con un modelo histórico que separa rendimiento, contexto del auto y dificultad de cada temporada.",
    "ranking.fact.seasons": "TEMPORADAS",
    "ranking.fact.drivers": "PILOTOS",
    "ranking.fact.since": "DESDE",
    "ranking.btn": "VER EL RANKING",
    "ranking.chart.head": "COMPARACIÓN HISTÓRICA — MODELO V7.6",
    "ranking.chart.sub": "RATING ELO DE CARRERA",
    "ranking.chart.retro": "ELO RETROSPECTIVO",
    "ranking.chart.archive": "ARCHIVO",
    
    "games.eyebrow": "PARTIDAS RÁPIDAS",
    "games.title": "MÁS <em>JUEGOS</em>",
    "games.career": "JUEGOS — MODO CARRERA"
  },
  en: {
    "nav.home": "Home",
    "nav.news": "News",
    "nav.season": "Season",
    "nav.races": "Races",
    "nav.archive": "Archive",
    "nav.history": "History",
    "nav.games": "Games",
    "nav.live": "Live",
    
    "hero.kicker": "YOUR DIGITAL PADDOCK",
    "hero.title": "THE WHOLE WORLD OF <EM>FORMULA 1</EM>",
    "hero.lede": "Results, games, statistics and stories. A single starting line to experience and understand the pinnacle of motorsport.",
    "hero.btn.results": "SEE LATEST RESULTS",
    "hero.btn.games": "GO TO GAMES",
    
    "dashboard.title": "DRIVERS' CHAMPIONSHIP",
    "dashboard.leader": "CURRENT LEADER",
    "dashboard.champ": "Championship",
    "dashboard.pts": "PTS",
    
    "results.eyebrow": "SEASON",
    "results.title": "LATEST <em>RACES</em>",
    "results.btn": "STANDINGS & FORECAST",
    
    "news.eyebrow": "NEWS",
    "news.title": "LATEST IN <em>F1</em>",
    "news.btn": "ALL NEWS",
    
    "archive.eyebrow": "STATISTICS",
    "archive.title": "EXPLORE THE <em>ARCHIVE</em>",
    
    "ranking.eyebrow": "MODEL V7.6",
    "ranking.title": "HISTORICAL <em>RANKING</em>",
    "ranking.desc": "Compare drivers from different eras using a historical model that separates performance, car context, and season difficulty.",
    "ranking.fact.seasons": "SEASONS",
    "ranking.fact.drivers": "DRIVERS",
    "ranking.fact.since": "SINCE",
    "ranking.btn": "SEE FULL RANKING",
    "ranking.chart.head": "HISTORICAL COMPARISON — V7.6 MODEL",
    "ranking.chart.sub": "CAREER ELO RATING",
    "ranking.chart.retro": "RETROSPECTIVE ELO",
    "ranking.chart.archive": "ARCHIVE",
    
    "games.eyebrow": "QUICK MATCHES",
    "games.title": "MORE <em>GAMES</em>",
    "games.career": "GAMES — CAREER MODE"
  }
};

export type LangCode = "es" | "en";
export type DictKey = keyof typeof uiDict["es"];

export function getLang(): LangCode {
  try {
    const cookieStore = cookies();
    const lang = cookieStore.get('NEXT_LOCALE')?.value;
    return lang === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

export function useTranslation(lang: LangCode) {
  return (key: DictKey) => {
    return uiDict[lang][key] || key;
  };
}
