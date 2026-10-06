import articles from "@/data/circuit-articles.json";
import photos from "@/data/circuit-photos.json";

export type CircuitArticle = {
  character:string;legacy:string;layouts:Record<string,{title:string;text:string}>;
  additionalSources?:{label:string;url:string}[];
};
export type CircuitPhoto = {url:string;page:string;author:string;license:string;licenseUrl?:string|null;caption:string;alt:string};
export const circuitArticles:Record<string,CircuitArticle> = articles;
export const circuitPhotos:Record<string,CircuitPhoto[]> = photos;
