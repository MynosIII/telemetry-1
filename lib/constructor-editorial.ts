import articles from "@/data/constructor-articles.json";
import photos from "@/data/constructor-photos.json";
import logos from "@/data/constructor-logo-sources.json";
import type {CircuitPhoto} from "./circuit-editorial";

export type ConstructorArticle = {
  chapters: {title:string;paragraphs:string[]}[];
  sources: {label:string;url:string;revision?:number}[];
  wikipediaTitle?:string;
  coverage?:string;
};
export const constructorArticles: Record<string,ConstructorArticle> = articles;
export const constructorPhotos: Record<string,CircuitPhoto[]> = photos;
export const constructorLogoSources: Record<string,{source:string;role:string}> = logos;
