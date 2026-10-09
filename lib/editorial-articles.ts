import records from "@/data/articles-index.json";
import type { CircuitPhoto } from "@/lib/circuit-editorial";

export type EditorialArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  period: string;
  lead: string;
  sections: { id: string; title: string; paragraphs: string[]; sourceIds: string[] }[];
  sources: { id: string; title: string; url: string }[];
  related: { label: string; href: string }[];
  image?: CircuitPhoto;
};

export const editorialArticles = records as EditorialArticle[];
export const articleBySlug = (slug: string) => editorialArticles.find(article => article.slug === slug);
export const readingMinutes = (article: EditorialArticle) => Math.max(1, Math.ceil(
  [article.lead, ...article.sections.flatMap(section => section.paragraphs)].join(" ").split(/\s+/).length / 200
));
export const articleCategories = ["Los orígenes", "Revoluciones técnicas", "Ideas que cambiaron la F1"];
