"use client";

import Image from 'next/image';
import type { TyreCompany } from '@/lib/tyre-history';
import { tyreLogo } from '@/lib/tyre-logos';
import { FallbackImage } from './FallbackImage';

const flagCodes: Record<string, string> = { Italia: 'it', Japón: 'jp', Alemania: 'de', 'Reino Unido': 'gb', Bélgica: 'be', 'Estados Unidos': 'us', Francia: 'fr' };
export function TyreCountryFlag({ country }: { country: string }) {
  return <Image className="tyre-country-flag" src={`https://flagcdn.com/w80/${flagCodes[country]}.png`} alt={`Bandera de ${country}`} width={40} height={28} unoptimized loading="lazy" />;
}

/** Preserve the original artwork and give each brand enough contrast on the archive's dark theme. */
export function TyreLogoMark({ id, company }: { id: string; company: TyreCompany }) {
  const logo = tyreLogo(id);
  const background = id === 'goodyear' ? '#003478' : id === 'continental' ? '#ffa500' : '#f4f4f4';
  return <div className="tyre-brand-mark" style={{ color: company.color, background }}><FallbackImage sources={logo ? [logo.url] : []} alt={`Logo de ${company.name}`} fallback={<strong>{company.name}</strong>} /></div>;
}

export function TyreBrand({ id, company }: { id: string; company: TyreCompany }) {
  const source = tyreLogo(id)?.source;
  return <div className="tyre-brand"><TyreLogoMark id={id} company={company} /><span><TyreCountryFlag country={company.country} /> {company.country}</span>{source ? <a href={source} target="_blank" rel="noreferrer">Procedencia del logo ↗</a> : null}</div>;
}
