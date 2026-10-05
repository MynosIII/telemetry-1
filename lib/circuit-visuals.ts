const CIRCUIT_LAYOUT_ROOT =
  "https://f1-telemetry-games.vercel.app/f1-circuit-guesser/public/circuits";

const currentCircuitLayouts: Record<string, string> = {
  albert_park: "melbourne-2",
  shanghai: "shanghai-1",
  suzuka: "suzuka-2",
  miami: "miami-1",
  villeneuve: "montreal-6",
  monaco: "monaco-6",
  catalunya: "catalunya-6",
  red_bull_ring: "spielberg-3",
  silverstone: "silverstone-8",
  spa: "spa-francorchamps-4",
  hungaroring: "hungaroring-3",
  zandvoort: "zandvoort-5",
  monza: "monza-7",
  madring: "madring-1",
  baku: "baku-1",
  sepang: "sepang-1",
  marina_bay: "marina-bay-4",
  americas: "austin-1",
  rodriguez: "mexico-city-3",
  interlagos: "interlagos-2",
  vegas: "las-vegas-1",
  losail: "lusail-1",
  yas_marina: "yas-marina-2"
};

const countryCodes: Record<string, string> = {
  Australia: "AU",
  Argentina: "AR",
  China: "CN",
  Japan: "JP",
  USA: "US",
  Canada: "CA",
  Monaco: "MC",
  Spain: "ES",
  Austria: "AT",
  UK: "GB",
  Belgium: "BE",
  Hungary: "HU",
  Netherlands: "NL",
  Italy: "IT",
  Azerbaijan: "AZ",
  Malaysia: "MY",
  Singapore: "SG",
  Mexico: "MX",
  Brazil: "BR",
  Colombia: "CO",
  Qatar: "QA",
  UAE: "AE"
};

export function getCircuitLayoutUrl(circuitId: string) {
  const layout = currentCircuitLayouts[circuitId];
  return layout ? `${CIRCUIT_LAYOUT_ROOT}/${layout}.svg` : undefined;
}

export function getCountryFlagUrl(country: string) {
  const code = countryCodes[country];
  return code ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : undefined;
}

export function getCircuitMapUrl(
  latitude: number | undefined,
  longitude: number | undefined,
  fallbackQuery: string
) {
  const query = latitude !== undefined && longitude !== undefined
    ? `${latitude},${longitude}`
    : fallbackQuery;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
