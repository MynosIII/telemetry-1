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
  lead: string;
  sections: { id: string; title: string; paragraphs: string[]; sourceIds: string[]; diagram?: {url:string;alt:string;caption:string} }[];
  sources: { id: string; title: string; url: string }[];
  related: { label: string; href: string }[];
  image?: CircuitPhoto;
};

export const editorialArticles = records as EditorialArticle[];
export const articleBySlug = (slug: string) => editorialArticles.find(article => article.slug === slug);
export const readingMinutes = (article: EditorialArticle) => Math.max(1, Math.ceil(
  [article.lead, ...article.sections.flatMap(section => section.paragraphs)].join(" ").split(/\s+/).length / 200
));
export const articleCategories = ["Los orígenes", "Autos de leyenda", "Automovilismo argentino", "Revoluciones técnicas", "Ideas que cambiaron la F1"];
export const explainerCategories = ["Para empezar", "Reglamento", "Aerodinámica", "Neumáticos y pista", "Motor y combustible"];
