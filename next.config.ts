import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: { "/*": ["./public/history/model-events/**"] },
  outputFileTracingIncludes: {
    "/historia": ["./public/history/index.json"],
    "/historia/**": ["./public/history/tyre-analysis.json"],
    "/historia/[category]/[entityId]": ["./public/history/index.json", "./public/history/championships/*.json", "./public/history/cars.json", "./public/history/constructors/*.json", "./public/history/engines/*.json", "./public/history/circuits/*.json", "./public/history/nations/*.json", "./public/history/tyres/*.json", "./public/history/grands-prix/*.json", "./public/history/seasons/*.json"],
    "/historia/carreras/[year]/[round]": ["./public/history/races/*.json", "./public/history/championships/*.json", "./public/history/cars.json"],
    "/historia/autos": ["./public/history/cars.json"],
    "/historia/autos/[modelId]": ["./public/history/cars/*.json"],
    "/pilotos/*": ["./public/history/drivers/*.json"]
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
      { protocol: "https", hostname: "encrypted-tbn0.gstatic.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" }
    ]
  }
};

export default nextConfig;
