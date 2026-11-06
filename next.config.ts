import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: { "/*": ["./public/history/model-events/**"] },
  outputFileTracingIncludes: {
    "/[lang]": ["./public/history/index.json"],
    "/[lang]/historia": ["./public/history/index.json"],
    "/[lang]/historia/**": ["./public/history/tyre-analysis.json", "./public/history/circuit-results.json"],
    "/[lang]/historia/[category]/[entityId]": ["./public/history/index.json", "./public/history/championships/*.json", "./public/history/cars.json", "./public/history/constructors/*.json", "./public/history/engines/*.json", "./public/history/circuits/*.json", "./public/history/nations/*.json", "./public/history/tyres/*.json", "./public/history/grands-prix/*.json", "./public/history/seasons/*.json"],
    "/[lang]/historia/carreras/[year]/[round]": ["./public/history/races/*.json", "./public/history/championships/*.json", "./public/history/cars.json"],
    "/[lang]/historia/autos": ["./public/history/cars.json"],
    "/[lang]/circuitos/*": ["./public/history/circuits/*.json"],
    "/[lang]/historia/records": ["./public/history/records.json"],
    "/[lang]/historia/comparar": ["./public/history/index.json", "./public/history/drivers/*.json"],
    "/[lang]/historia/autos/[modelId]": ["./public/history/cars/*.json"],
    "/[lang]/pilotos/*": ["./public/history/drivers/*.json", "./public/history/driver-achievements.json"]
  },
  async redirects() {
    return [
      { source: "/estadisticas/laboratorio", destination: "/ranking", permanent: true },
      // The model view and its methodology now live on /ranking itself.
      { source: "/ranking/modelo", destination: "/ranking", permanent: true },
      { source: "/predestinato", destination: "/juegos/predestinato", permanent: true },
      // The archive keeps its /historia addresses; the menu calls it Estadísticas.
      { source: "/estadisticas", destination: "/historia", permanent: true }
    ];
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "f1-telemetry-games.vercel.app" },
      { protocol: "https", hostname: "flagcdn.com" },
      { protocol: "https", hostname: "www.statsf1.com" },
      { protocol: "https", hostname: "statsf1.com" },
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "raw.githubusercontent.com" }
    ]
  }
};

export default nextConfig;
