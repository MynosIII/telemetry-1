export const articleEras = [
  { id: "antes-de-1900", label: "Antes de 1900", title: "Cuando todo estaba por inventarse", from: 1800, to: 1899 },
  { id: "1900-1919", label: "1900–1919", title: "Los primeros grandes desafíos", from: 1900, to: 1919 },
  { id: "1920-1939", label: "1920–1939", title: "La edad de los Grand Prix", from: 1920, to: 1939 },
  { id: "1940-1959", label: "1940–1959", title: "Del regreso a las pistas al Mundial", from: 1940, to: 1959 },
  { id: "1960-1979", label: "1960–1979", title: "La imaginación toma el volante", from: 1960, to: 1979 },
  { id: "1980-1999", label: "1980–1999", title: "Potencia, materiales y electrónica", from: 1980, to: 1999 },
  { id: "2000-2009", label: "2000–2009", title: "Dinastías y sorpresas", from: 2000, to: 2009 },
  { id: "desde-2010", label: "Desde 2010", title: "Los límites de una nueva era", from: 2010, to: 2099 }
];
export const eraForYear = (year: number) => articleEras.find(era => year >= era.from && year <= era.to) ?? articleEras[0];
