import records from "@/data/articles-index.json";
import type { CircuitPhoto } from "@/lib/circuit-editorial";

export type EditorialArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  period: string;
  year: number;
  tags?: string[];
  kind?: "history" | "explainer";
  level?: "Inicial" | "Intermedio" | "Avanzado";
  reviewedOn?: string;
  /** Date the piece went up on the site; the newest one leads the home page. */
  publishedOn?: string;
  lead: string;
  sections: { id: string; title: string; paragraphs: string[]; sourceIds: string[]; diagram?: ArticleDiagram }[];
  sources: { id: string; title: string; url: string }[];
  related: { label: string; href: string }[];
  image?: CircuitPhoto;
  /** Optional English text, section by section in the same order. */
  en?: {
    title: string;
    description: string;
    lead: string;
    sections: { title: string; paragraphs: string[]; diagram?: Partial<ArticleDiagram> }[];
    related?: string[];
    image?: { caption: string; alt: string };
  };
};
type ArticleDiagram = {url:string;alt:string;caption:string;height?:number};

export const editorialArticles = records as EditorialArticle[];
export const articleBySlug = (slug: string) => editorialArticles.find(article => article.slug === slug);
export const readingMinutes = (article: EditorialArticle) => Math.max(1, Math.ceil(
  [article.lead, ...article.sections.flatMap(section => section.paragraphs)].join(" ").split(/\s+/).length / 200
));
export const articleCategories = ["Los orígenes", "Autos de leyenda", "Automovilismo argentino", "Revoluciones técnicas", "Ideas que cambiaron la F1"];
export const explainerCategories = ["Para empezar", "Reglamento", "Aerodinámica", "Neumáticos y pista", "Motor y combustible", "Pilotaje y controles", "Seguridad"];

/** The most recently published article, which the home page shows first. */
export const latestArticle = () => editorialArticles
  .filter(article => article.publishedOn)
  .sort((a, b) => b.publishedOn!.localeCompare(a.publishedOn!))[0];

/** The article in the visitor's language when it has an English version; Spanish otherwise. */
export function localizeArticle(article: EditorialArticle, lang: "es" | "en"): EditorialArticle & { english: boolean } {
  const en = lang === "en" ? article.en : undefined;
  if (!en) return { ...article, english: false };
  return {
    ...article,
    english: true,
    title: en.title,
    description: en.description,
    lead: en.lead,
    sections: article.sections.map((section, i) => ({
      ...section,
      title: en.sections[i]?.title ?? section.title,
      paragraphs: en.sections[i]?.paragraphs ?? section.paragraphs,
      diagram: section.diagram && { ...section.diagram, ...en.sections[i]?.diagram }
    })),
    related: article.related.map((link, i) => ({ ...link, label: en.related?.[i] ?? link.label })),
    image: article.image && { ...article.image, ...en.image }
  };
}

const englishCategories: Record<string, string> = {
  "Los orígenes": "The origins", "Autos de leyenda": "Legendary cars", "Automovilismo argentino": "Argentine motorsport",
  "Revoluciones técnicas": "Technical revolutions", "Ideas que cambiaron la F1": "Ideas that changed F1",
  "Para empezar": "Getting started", "Reglamento": "Regulations", "Aerodinámica": "Aerodynamics", "Neumáticos y pista": "Tyres and track",
  "Motor y combustible": "Engine and fuel", "Pilotaje y controles": "Driving and controls", "Seguridad": "Safety"
};
export const categoryLabel = (category: string, english: boolean) => english ? englishCategories[category] ?? category : category;
