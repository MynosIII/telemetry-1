"use client";

import { useState } from 'react';
import Image from 'next/image';
import type { TyreCompany } from '@/lib/tyre-history';

const flagCodes: Record<string, string> = { Italia: 'it', Japón: 'jp', Alemania: 'de', 'Reino Unido': 'gb', Bélgica: 'be', 'Estados Unidos': 'us', Francia: 'fr' };
export function TyreCountryFlag({ country }: { country: string }) {
  return <Image className="tyre-country-flag" src={`https://flagcdn.com/w80/${flagCodes[country]}.png`} alt={`Bandera de ${country}`} width={40} height={28} unoptimized loading="lazy" />;
}

export function TyreBrand({ company }: { company: TyreCompany }) {
  const [failed, setFailed] = useState(false);
  return <div className="tyre-brand"><div className="tyre-brand-mark" style={{ color: company.color }}>{company.logo && !failed ? <Image src={company.logo.url} alt={`Logo de ${company.name}`} width={320} height={84} unoptimized onError={() => setFailed(true)} /> : <strong>{company.name}</strong>}</div><span><TyreCountryFlag country={company.country} /> {company.country}</span>{company.logo && !failed ? <a href={company.logo.source} target="_blank" rel="noreferrer">Logo · Wikimedia Commons ↗</a> : null}</div>;
}
