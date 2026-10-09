import {readFile} from "node:fs/promises";
import path from "node:path";
import {cache} from "react";
import articles from "@/data/grand-prix-articles.json";
import venueData from "@/data/grand-prix-venues.json";
import historicalPhotos from "@/data/grand-prix-venue-photos.json";
import circuitPhotos from "@/data/circuit-photos.json";
import type {CircuitPhoto} from "./circuit-editorial";
import type {ArchiveRef} from "./championship-history";
export type GrandPrixVenue={id:string;name:string;circuitId:string|null;href:string|null;latitude:number|null;longitude:number|null;coordinateScope:string;source:string};
export type GrandPrixEdition={year:number;round:number;date:string;href:string;circuit:ArchiveRef;winners:{id:string;name:string;href:string|null}[];constructors:ArchiveRef[];pole:{id:string;name:string;href:string|null}|null;poleTime:string|null;fastest:{id:string;name:string;href:string|null}[];winnerTime:string|null;distance:number|null;modelCount:number;summary:string[]};
export type HistoricalEdition={year:number;winners:string;winnerLinks:{name:string;url:string}[];vehicle:string|null;location:string|null;venueId:string|null;report:string;raceClass:string|null;eventTitle:string|null;designation:string|null;handicap:boolean;note:string|null};
export type GrandPrixEditions={world:GrandPrixEdition[];historical:HistoricalEdition[];historicalSource:string|null};
export const getGrandPrixEditions=cache(async():Promise<{meta:{through:number};grandsPrix:Record<string,GrandPrixEditions>} >=>JSON.parse(await readFile(path.join(process.cwd(),"public/history/grand-prix-editions.json"),"utf8")));
export const grandPrixArticles:Record<string,{chapters:{title:string;text:string}[];sources:{label:string;url:string}[];related:string[]}>=articles;
export const grandPrixVenues:Record<string,GrandPrixVenue>=venueData;
const archivePhotos:Record<string,CircuitPhoto[]>=circuitPhotos;
const oldPhotos:Record<string,CircuitPhoto[]>=historicalPhotos;
export function grandPrixVenuePhotos(venue:GrandPrixVenue):CircuitPhoto[]{return venue.circuitId?archivePhotos[venue.circuitId]??[]:oldPhotos[venue.id]??[];}
export function editionYears(years:number[]):string{
 const sorted=[...new Set(years)].sort((a,b)=>a-b);const ranges:string[]=[];
 for(let i=0;i<sorted.length;i++){const start=sorted[i];let end=start;while(sorted[i+1]===end+1)end=sorted[++i];ranges.push(start===end?String(start):`${start}–${end}`);}
 return ranges.join(", ");
}
