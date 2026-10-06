"use client";

import Image from 'next/image';
import type { TyreCompany } from '@/lib/tyre-history';
import { tyreLogo } from '@/lib/tyre-logos';
import { FallbackImage } from './FallbackImage';

const flagCodes: Record<string, string> = { Italia: 'it', Japón: 'jp', Alemania: 'de', 'Reino Unido': 'gb', Bélgica: 'be', 'Estados Unidos': 'us', Francia: 'fr' };
export function TyreCountryFlag({ country }: { country: string }) {
  return <Image className="tyre-country-flag" src={`https://flagcdn.com/w80/${flagCodes[country]}.png`} alt={`Bandera de ${country}`} width={40} height={28} unoptimized loading="lazy" />;
}

/** The manufacturer's logo on a transparent panel, or its name when there is no logo or it fails to load. */
export function TyreLogoMark({ id, company }: { id: string; company: TyreCompany }) {
  const logo = tyreLogo(id);
  return <div className="tyre-brand-mark" style={{ color: company.color }}><FallbackImage sources={logo ? [logo.url] : []} alt={`Logo de ${company.name}`} fallback={<strong>{company.name}</strong>} /></div>;
}

export function TyreBrand({ id, company }: { id: string; company: TyreCompany }) {
  const source = tyreLogo(id)?.source;
  return <div className="tyre-brand"><TyreLogoMark id={id} company={company} /><span><TyreCountryFlag country={company.country} /> {company.country}</span>{source ? <a href={source} target="_blank" rel="noreferrer">Logo · Wikimedia Commons ↗</a> : null}</div>;
}
