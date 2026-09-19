# Telemetry 1

Formula 1 results, driver profiles, circuit information, historical statistics, and bilingual games.

Production: https://telemetry-1.vercel.app

## Development

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Run `npm run build` to check the production build and TypeScript types.

Copy `.env.example` to `.env.local` if authenticated OpenF1 access is needed. Keep credentials in local environment files and Vercel's environment settings; never commit them.

## Deployment

The existing Vercel project `telemetry-1` is connected to this repository. Pushes to `main` build and deploy production on Vercel; other branches create previews. The project root is the repository root and the framework is Next.js. No local computer or development server is needed to serve the deployed website.

The embedded games are maintained and deployed independently:

- [F1 Telemetry Games](https://github.com/MynosIII/F1-Telemetry-Games) → https://f1-telemetry-games.vercel.app
- [Predestinato](https://github.com/MynosIII/Predestinato) → https://predestinato.vercel.app

The historical statistics application is bundled in `public/laboratorio-historico`. The image catalog and cached portraits are served by the games project. Keep those production URLs available when changing repositories or domains.

The existing weekly `/api/cron/post-race` schedule is defined in `vercel.json`. Runtime environment settings remain configured in Vercel.
