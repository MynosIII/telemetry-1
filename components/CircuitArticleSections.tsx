import {circuitArticles,circuitPhotos} from "@/lib/circuit-editorial";
import {CircuitArticlePhoto} from "./CircuitArticlePhoto";
import {layoutSeasons} from "@/lib/circuit-layouts";

export function CircuitArticleSections({circuitId}:{circuitId:string}) {
  const article=circuitArticles[circuitId];
  if(!article)return null;
  return <><h3>El carácter de la pista</h3><p>{article.character}</p><h3>Su lugar en la historia del automovilismo</h3><p>{article.legacy}</p></>;
}

export function CircuitArticleGallery({circuitId}:{circuitId:string}) {
  const photos=circuitPhotos[circuitId]??[];
  return photos.length?<div className={`circuit-article-gallery${photos.length>1?" circuit-article-gallery-pair":""}`}>{photos.map(photo=><CircuitArticlePhoto key={photo.page} photo={photo}/>)}</div>:null;
}

export function CircuitLayoutTimeline({circuitId,layoutIds}:{circuitId:string;layoutIds:string[]}){
  const article=circuitArticles[circuitId];
  if(!article||layoutIds.length<2)return null;
  return <nav className="circuit-layout-timeline" aria-label="Etapas del trazado"><h3>La pista a través de sus versiones</h3><p className="history-note">Las versiones agrupan configuraciones utilizadas por el Mundial. Una misma ficha puede incluir ajustes menores, y algunas variantes coexistieron. Los años indican las carreras del archivo, no necesariamente la fecha de construcción.</p><ol>{layoutIds.map(id=><li key={id}><a href={`#trazado-${id}`}><span>{layoutSeasons(id)}</span><strong>{article.layouts[id]?.title??id}</strong></a></li>)}</ol></nav>;
}

export function CircuitLayoutStory({circuitId,layoutId,first}:{circuitId:string;layoutId:string;first:boolean}){
  const story=circuitArticles[circuitId]?.layouts[layoutId];
  return story?<div className="circuit-layout-story"><span className="circuit-editorial-label">{first?"Primera configuración del archivo":"Qué cambió en esta versión"}</span><h4>{story.title}</h4><p>{story.text}</p></div>:null;
}

export function CircuitEditorialSources({circuitId}:{circuitId:string}){
  const sources=circuitArticles[circuitId]?.additionalSources??[];
  return sources.length?<ul>{sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label} ↗</a></li>)}</ul>:null;
}
