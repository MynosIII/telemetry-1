"use client";
import {useEffect,useRef,useState} from "react";
import type {CircuitPhoto} from "@/lib/circuit-editorial";

export function CircuitArticlePhoto({photo}:{photo:CircuitPhoto}) {
  const [failed,setFailed]=useState(false);
  const image=useRef<HTMLImageElement>(null);
  useEffect(()=>{if(image.current?.complete&&image.current.naturalWidth===0)setFailed(true);},[]);
  return <figure className="circuit-article-photo">
    {failed?<a className="circuit-photo-unavailable" href={photo.page} target="_blank" rel="noreferrer">Ver fotografía en Wikimedia Commons ↗</a>:<a href={photo.page} target="_blank" rel="noreferrer"><img ref={image} src={photo.url} alt={photo.alt} width={1200} height={800} loading="lazy" onError={()=>setFailed(true)}/></a>}
    <figcaption><p>{photo.caption}</p><small>Foto: {photo.author} · {photo.licenseUrl?<a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a>:photo.license} · <a href={photo.page} target="_blank" rel="noreferrer">Archivo original ↗</a></small></figcaption>
  </figure>;
}
