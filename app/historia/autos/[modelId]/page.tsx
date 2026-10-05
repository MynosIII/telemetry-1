import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArchiveReference } from "@/components/ArchiveReference";
import { CarPhoto } from "@/components/CarPhoto";
import { carImage } from "@/lib/team-media";
import { Encyclopedia, EncyclopediaSection } from "@/components/Encyclopedia";
import { getHistoricCar } from "@/lib/championship-history";

type Props = { params: Promise<{ modelId: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { modelId } = await params; const car = await getHistoricCar(modelId);
  return { title: car ? `${car.name} · Autos históricos` : "Chasis histórico" };
}
export default async function CarPage({ params }: Props) {
  const { modelId } = await params; const car = await getHistoricCar(modelId);
  if (!car) notFound();
  const sections = [{ id: "modelo", name: "El modelo" }, { id: "inscripciones", name: "Pilotos, motores y temporadas" }, { id: "fuentes", name: "Identificación y fuentes" }];
  const image = carImage(car);
  const aside = image.sources.length ? <div className="ency-infobox"><CarPhoto image={image} alt={car.name} /></div> : null;
  return <main id="top" className="ency-page"><SiteHeader /><div className="ency-page-wrap"><header className="ency-title"><nav className="ency-breadcrumb" aria-label="Ruta del artículo"><Link href="/historia">Estadísticas</Link><span>/</span><Link href="/historia/autos">Autos</Link></nav><h1>{car.name}</h1><p className="ency-subtitle"><ArchiveReference entity={car.constructor} /> · {car.seasons.length > 1 ? `${car.seasons[0]}–${car.seasons.at(-1)}` : car.seasons[0]} · motor {car.engines.map((e, i) => <span key={e.id}>{i ? ", " : ""}<ArchiveReference entity={e} /></span>)}</p></header><Encyclopedia sections={sections} aside={aside}><EncyclopediaSection id="modelo" title="El modelo" open><p>{car.name} figura en las inscripciones de {car.seasons.length} temporada{car.seasons.length === 1 ? "" : "s"} con {car.constructor.name}: {car.drivers.length} piloto{car.drivers.length === 1 ? "" : "s"} y {car.engines.length} motorista{car.engines.length === 1 ? "" : "s"}.</p><div className="ency-controls">{car.seasons.map(year => <Link key={year} href={`/historia/seasons/${year}`}>Temporada {year} →</Link>)}</div></EncyclopediaSection><EncyclopediaSection id="inscripciones" title="Pilotos, motores y temporadas" open><div className="ency-table-scroll"><table><caption>Inscripciones documentadas del {car.name}</caption><thead><tr><th>Año</th><th>Escudería</th><th>Piloto</th><th>Motor</th><th>Neumáticos</th><th>Rondas declaradas</th><th>Identificación</th></tr></thead><tbody>{car.entries.map((e, i) => <tr key={i}><th><Link href={`/historia/seasons/${e.year}`}>{e.year}</Link></th><td>{e.entrant}</td><td><ArchiveReference entity={e.driver} /></td><td><ArchiveReference entity={e.engine} /><small>{e.engineModel}</small></td><td><ArchiveReference entity={e.tyre} /></td><td>{e.rounds}</td><td>{e.multipleModels ? "Inscripción con varios chasis" : "Chasis único en la inscripción"}</td></tr>)}</tbody></table></div></EncyclopediaSection><EncyclopediaSection id="fuentes" title="Identificación y fuentes"><p><a href={car.source} target="_blank" rel="noreferrer">F1DB · CC BY 4.0</a> identifica los chasis por constructor y modelo, con las listas de inscripciones de cada temporada.</p><p><a href={`https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(car.name)}`} target="_blank" rel="noreferrer">Buscar {car.name} en Wikipedia ↗</a></p><p>El análisis ELO de cada carrera está en las fichas de sus Grandes Premios y en el <Link href="/ranking">ranking TelemetryOne</Link>.</p><a href={`/history/cars/${car.id}.json`} target="_blank" rel="noreferrer">Datos del modelo (JSON) ↗</a></EncyclopediaSection></Encyclopedia></div><SiteFooter /></main>;
}
