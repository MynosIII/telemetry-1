import { dictionaries } from "@/lib/dictionary";
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

/** Resolve calendar circuit IDs to the historical archive's F1DB identities. */
export function getCircuitHistoryId(circuitId: string) {
  return currentCircuitLayouts[circuitId]?.replace(/-\d+$/, "") ?? circuitId.replaceAll("_", "-");
}

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
  UAE: "AE",
  "Saudi Arabia": "SA",
  Bahrain: "BH",
  "United Kingdom": "GB",
  "United States": "US",
  "United States of America": "US",
  "United Arab Emirates": "AE",
  France: "FR",
  Germany: "DE",
  Portugal: "PT",
  Turkey: "TR",
  Russia: "RU",
  "South Africa": "ZA",
  "South Korea": "KR",
  India: "IN",
  Switzerland: "CH",
  Sweden: "SE",
  Morocco: "MA",
  "New Zealand": "NZ", Ireland: "IE", "Hong Kong": "HK", Finland: "FI", Venezuela: "VE", Poland: "PL",
  Uruguay: "UY", Thailand: "TH", Zimbabwe: "ZW", Chile: "CL", Denmark: "DK", Liechtenstein: "LI",
  Indonesia: "ID", Czechia: "CZ", Luxembourg: "LU", Taiwan: "TW", "San Marino": "SM"
};

// Race data arrives translated ("Japón", "Países Bajos"); map those back to the English keys above.
const englishCountry: Record<string, string> = {};
for (const [english, spanish] of Object.entries(dictionaries.countries)) englishCountry[spanish] ??= english;
const countryKey = (country: string) => englishCountry[country] ?? country;

// ISO 3166 alpha-3, so the track column never collides with the viewer columns (ARG, BRA, COL, MEX).
const countryCodes3: Record<string, string> = {
  Australia: "AUS", Argentina: "ARG", China: "CHN", Japan: "JPN", USA: "USA", "United States": "USA",
  Canada: "CAN", Monaco: "MCO", Spain: "ESP", Austria: "AUT", UK: "GBR", "United Kingdom": "GBR",
  Belgium: "BEL", Hungary: "HUN", Netherlands: "NLD", Italy: "ITA", Azerbaijan: "AZE", Malaysia: "MYS",
  Singapore: "SGP", Mexico: "MEX", Brazil: "BRA", Colombia: "COL", Qatar: "QAT", UAE: "ARE",
  "Saudi Arabia": "SAU", Bahrain: "BHR", France: "FRA", Germany: "DEU", Portugal: "PRT", Turkey: "TUR", Russia: "RUS"
};

export function getCountryCode(country: string) {
  return countryCodes3[countryKey(country)] ?? country.toUpperCase();
}

export function getCircuitLayoutUrl(circuitId: string) {
  const layout = currentCircuitLayouts[circuitId];
  return layout ? `${CIRCUIT_LAYOUT_ROOT}/${layout}.svg` : undefined;
}

export function getCountryFlagUrl(country: string) {
  const code = countryCodes[countryKey(country)];
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
