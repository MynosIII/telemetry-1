import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import { translate } from './dictionary';

export type TyreCompany = {
  name: string; country: string; flag: string; founded: number; founders: string;
  location: string; locationLabel: string; wikipedia: string; website?: string;
  sources: { name: string; url: string }[]; story: string; color: string;
  logo?: { url: string; source: string };
};
export const tyreCompanies: Record<string, TyreCompany> = {
  pirelli: {
    name: 'Pirelli', country: 'Italia', flag: '🇮🇹', founded: 1872, founders: 'Giovanni Battista Pirelli',
    location: 'Bicocca, Milán, Italia', locationLabel: 'Sede', color: '#d3242c',
    wikipedia: 'https://en.wikipedia.org/wiki/Pirelli', website: 'https://www.pirelli.com/',
    sources: [{ name: 'Pirelli · historia', url: 'https://corporate.pirelli.com/corporate/en-ww/aboutus/history' }, { name: 'Pirelli · sede de Milán', url: 'https://corporate.pirelli.com/corporate/en-ww/aboutus/pirelli-headquarters' }],
    story: 'Nacida en Milán en 1872, la empresa de Giovanni Battista Pirelli comenzó fabricando artículos de caucho antes de ampliar su actividad a los neumáticos. Su sede en Bicocca vincula ese pasado industrial con el centro corporativo actual. En F1, sus distintas etapas deben leerse por separado: el archivo conecta la presencia inicial del campeonato, el regreso de los años ochenta y la etapa de proveedor único iniciada en 2011.',
    logo: { url: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Pirelli_-_logo_full_%28Italy%2C_1997%29.svg', source: 'https://commons.wikimedia.org/wiki/File:Pirelli_-_logo_full_(Italy,_1997).svg' }
  },
  bridgestone: {
    name: 'Bridgestone', country: 'Japón', flag: '🇯🇵', founded: 1931, founders: 'Shojiro Ishibashi',
    location: 'Kyobashi, Tokio, Japón', locationLabel: 'Sede', color: '#bd2026',
    wikipedia: 'https://en.wikipedia.org/wiki/Bridgestone', website: 'https://www.bridgestone.com/',
    sources: [{ name: 'Bridgestone · perfil corporativo', url: 'https://www.bridgestone.com/corporate/profile/' }, { name: 'Bridgestone · origen en Kurume', url: 'https://www.bridgestone.com/blog/2019082801.html' }],
    story: 'Shojiro Ishibashi fundó Bridgestone en Kurume en 1931; su sede corporativa está en Tokio. Su historial de F1 incluye apariciones anteriores a su programa regular de finales de los años noventa. La ficha distingue las carreras frente a otros proveedores de las disputadas con un único fabricante registrado.'
  },
  continental: {
    name: 'Continental', country: 'Alemania', flag: '🇩🇪', founded: 1871, founders: 'Sociedad anónima Continental-Caoutchouc- und Gutta-Percha Compagnie',
    location: 'Hanóver, Alemania', locationLabel: 'Sede', color: '#9b6500',
    wikipedia: 'https://en.wikipedia.org/wiki/Continental_AG', website: 'https://www.continental.com/',
    sources: [{ name: 'Continental · hitos', url: 'https://www.continental.com/en/company/history/milestones/' }, { name: 'Continental · Hanóver', url: 'https://www.continental.com/en/company/history/150-years/people-and-motifs/from-hanover-into-the-world/' }],
    story: 'Continental nació en Hanóver en 1871 como una sociedad dedicada a productos de caucho. Esa ciudad conserva su papel como sede de la compañía. Su breve presencia en el Campeonato Mundial ofrece un caso de estudio distinto de los programas prolongados de otros proveedores: los resultados deben relacionarse con los autos y pilotos a los que abastecía.'
  },
  dunlop: {
    name: 'Dunlop', country: 'Reino Unido', flag: '🇬🇧', founded: 1889, founders: 'Harvey du Cros y John Boyd Dunlop',
    location: 'Fort Dunlop, Birmingham, Reino Unido', locationLabel: 'Sede histórica de Dunlop Rubber', color: '#876800',
    wikipedia: 'https://en.wikipedia.org/wiki/Dunlop_Rubber',
    sources: [{ name: 'Wikipedia · Dunlop Rubber', url: 'https://en.wikipedia.org/wiki/Dunlop_Rubber' }],
    story: 'El negocio original se constituyó en Dublín en 1889 con Harvey du Cros y John Boyd Dunlop, alrededor del desarrollo del neumático de aire. Su expansión industrial tuvo un centro importante en Fort Dunlop, Birmingham. La marca y la sociedad histórica no son una misma entidad corporativa permanente; aquí la ubicación corresponde a Dunlop Rubber y las estadísticas a la identidad deportiva Dunlop.'
  },
  englebert: {
    name: 'Englebert', country: 'Bélgica', flag: '🇧🇪', founded: 1868, founders: 'Oscar Englebert',
    location: 'Lieja, Bélgica', locationLabel: 'Origen y centro histórico', color: '#345842',
    wikipedia: 'https://en.wikipedia.org/wiki/Englebert_(tyre_manufacturer)',
    sources: [{ name: 'Wikipedia · fabricante Englebert', url: 'https://en.wikipedia.org/wiki/Englebert_(tyre_manufacturer)' }],
    story: 'Oscar Englebert inició su negocio de artículos de caucho en Lieja en 1868. La fabricación de neumáticos llegó después y abrió la puerta al automovilismo. La ficha conserva la identidad del proveedor de los años cincuenta, sin presentar a la empresa histórica como una compañía independiente actual.'
  },
  firestone: {
    name: 'Firestone', country: 'Estados Unidos', flag: '🇺🇸', founded: 1900, founders: 'Harvey S. Firestone',
    location: 'Akron, Ohio, Estados Unidos', locationLabel: 'Ciudad de fundación', color: '#a9292b',
    wikipedia: 'https://en.wikipedia.org/wiki/Firestone_(company)', website: 'https://www.firestonetire.com/',
    sources: [{ name: 'Firestone · historia de la marca', url: 'https://www.firestonetire.com/about-firestone/heritage/' }],
    story: 'Harvey Firestone fundó su compañía en Akron en 1900. Su tradición de competición está ligada tanto al automovilismo estadounidense como al Campeonato Mundial. Indianápolis formó parte del campeonato entre 1950 y 1960: esos registros permanecen incluidos y ayudan a explicar la presencia de Firestone en el archivo.'
  },
  goodyear: {
    name: 'Goodyear', country: 'Estados Unidos', flag: '🇺🇸', founded: 1898, founders: 'Frank A. Seiberling',
    location: 'Akron, Ohio, Estados Unidos', locationLabel: 'Sede', color: '#254a8f',
    wikipedia: 'https://en.wikipedia.org/wiki/Goodyear_Tire_and_Rubber_Company', website: 'https://www.goodyear.com/',
    sources: [{ name: 'Goodyear · historia corporativa', url: 'https://corporate.goodyear.com/us/en/company/history.html' }, { name: 'Goodyear · compañía', url: 'https://corporate.goodyear.com/us/en.html' }],
    story: 'Fundada por Frank Seiberling en Akron en 1898, la empresa tomó el nombre de Charles Goodyear como homenaje al pionero de la vulcanización. Akron sigue siendo su sede. Su largo recorrido en F1 atraviesa etapas de competencia entre fabricantes y temporadas con un único proveedor registrado; ambas se pueden explorar por separado.'
  },
  michelin: {
    name: 'Michelin', country: 'Francia', flag: '🇫🇷', founded: 1889, founders: 'André y Édouard Michelin',
    location: 'Clermont-Ferrand, Francia', locationLabel: 'Sede', color: '#244b99',
    wikipedia: 'https://en.wikipedia.org/wiki/Michelin', website: 'https://www.michelin.com/',
    sources: [{ name: 'Michelin · historia', url: 'https://www.michelin.com/en/group/heritage' }, { name: 'Michelin · origen en 1889', url: 'https://guide.michelin.com/es/es/historia-de-la-guia-michelin' }, { name: 'Michelin · sede', url: 'https://www.michelin.com/mentions-legales' }],
    story: 'André y Édouard Michelin dieron origen a la empresa en Clermont-Ferrand en 1889. La ciudad continúa como sede del grupo. Su historia tecnológica incluye el neumático radial, patentado en 1946. Las dos etapas de Michelin en el Campeonato Mundial se pueden seguir en la tabla por temporada y en las conexiones con pilotos y constructores.'
  },
  avon: {
    name: 'Avon', country: 'Reino Unido', flag: '🇬🇧', founded: 1885, founders: 'E. G. Browne y J. C. Margetson',
    location: 'Melksham, Wiltshire, Reino Unido', locationLabel: 'Centro industrial histórico', color: '#31583d',
    wikipedia: 'https://en.wikipedia.org/wiki/Avon_Technologies',
    sources: [{ name: 'Bradford on Avon Museum · historia industrial', url: 'https://www.bradfordonavonmuseum.co.uk/avon' }, { name: 'Wikipedia · historia de Avon', url: 'https://en.wikipedia.org/wiki/Avon_Technologies' }],
    story: 'La historia de Avon parte del negocio de caucho adquirido por Browne y Margetson en Limpley Stoke en 1885 y trasladado a Melksham en 1890. El negocio de neumáticos se separó de la compañía original en 1997. Por eso la ficha usa el centro industrial histórico de la marca y no atribuye automáticamente al proveedor de F1 la sede de su sucesor corporativo.'
  }
};
export type TyreCount = { races: number; wins: number };
export type TyreSeason = TyreCount & { year: number; multi: TyreCount; sole: TyreCount; unknown: TyreCount };
export type TyreEvent = { year: number; round: number; date: string; name: string; href: string };
export type TyreAnalysis = {
  id: string; bestFinish: number | null; bestGrid: number | null; officialPoles: number;
  first: TyreEvent; last: TyreEvent; seasons: TyreSeason[];
  modes: { multi: TyreCount; sole: TyreCount; unknown: TyreCount };
};
export const getTyreAnalysis = cache(async (): Promise<{ resultsThrough: string; tyres: Record<string, TyreAnalysis> }> => {
  const data = JSON.parse(await readFile(path.join(process.cwd(), 'public/history/tyre-analysis.json'), 'utf8'));
  for (const tyre of Object.values(data.tyres) as TyreAnalysis[]) {
    tyre.first.name = translate(tyre.first.name, 'races');
    tyre.last.name = translate(tyre.last.name, 'races');
  }
  return data;
});
