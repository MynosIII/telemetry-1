"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

export function CircuitLocationMap({latitude,longitude,name,paths}:{latitude:number;longitude:number;name:string;paths:number[][][]}) {
  const container=useRef<HTMLDivElement>(null);
  const map=useRef<LeafletMap|null>(null);
  const [wheel,setWheel]=useState(false);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    let disposed=false;
    import("leaflet").then(L=>{
      if(disposed||!container.current)return;
      const instance=L.map(container.current,{scrollWheelZoom:false}).setView([latitude,longitude],14);
      map.current=instance;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(instance);
      L.circleMarker([latitude,longitude],{radius:6,color:"#28cfff",fillOpacity:1}).addTo(instance).bindTooltip(name);
      if(paths.length){const outline=L.polyline(paths as [number,number][][],{color:"#ff4d42",weight:4}).addTo(instance);instance.fitBounds(outline.getBounds(),{padding:[25,25],maxZoom:16});}
    }).catch(()=>{if(!disposed)setFailed(true);});
    return ()=>{disposed=true;map.current?.remove();map.current=null;};
  },[latitude,longitude,name,paths]);
  function toggleWheel(){const enabled=!wheel;setWheel(enabled);if(enabled)map.current?.scrollWheelZoom.enable();else map.current?.scrollWheelZoom.disable();}
  return <div className="circuit-map"><div ref={container} className="circuit-map-canvas" role="region" aria-label={`Mapa interactivo de ${name}`}/>{failed?<p>No se pudo cargar el mapa. Abrí la ubicación con el enlace de abajo.</p>:null}<div className="circuit-map-actions"><button type="button" aria-pressed={wheel} onClick={toggleWheel}>{wheel?"Desactivar":"Activar"} zoom con rueda</button><a href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`} target="_blank" rel="noreferrer">Abrir ubicación ↗</a></div><p className="history-note">Arrastrá para recorrer el mapa y usá + / − para acercar. {paths.length?"En rojo: vías de competición actuales registradas en OpenStreetMap, que pueden incluir variantes y calles de boxes. No reconstruyen los trazados históricos.":"No hay un contorno actual disponible en este archivo; el marcador indica la ubicación del recinto."}</p></div>;
}
