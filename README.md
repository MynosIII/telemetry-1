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

For branches, pull requests, checks, and Vercel previews, see
[CONTRIBUTING.md](CONTRIBUTING.md). Published historical snapshots are included
in this repository; the original research workspace is not required to run the web.

Copy `.env.example` to `.env.local` if authenticated OpenF1 access is needed. Keep credentials in local environment files and Vercel's environment settings; never commit them.

## Deployment

The existing Vercel project `telemetry-1` is connected to this repository. Pushes to `main` build and deploy production on Vercel; other branches create previews. The project root is the repository root and the framework is Next.js. No local computer or development server is needed to serve the deployed website.

The embedded games are maintained and deployed independently:

- [F1 Telemetry Games](https://github.com/MynosIII/F1-Telemetry-Games) → https://f1-telemetry-games.vercel.app
- [Predestinato](https://github.com/MynosIII/Predestinato) → https://predestinato.vercel.app

The historical statistics application is bundled in `public/laboratorio-historico`. The image catalog and cached portraits are served by the games project. Keep those production URLs available when changing repositories or domains.

The existing weekly `/api/cron/post-race` schedule is defined in `vercel.json`. Runtime environment settings remain configured in Vercel.

## Historical encyclopedia

### Tyre manufacturers

`/historia/neumaticos` indexes all nine suppliers. `/historia/tyres/<id>` has a
dedicated encyclopedia layout with company history, sourced location and
founders, archive statistics, linked first/last events, and season charts.
`npm run build:tyres` derives `public/history/tyre-analysis.json` from the
published race dossiers. `npm run verify:tyres` checks supplier totals, shared
wins, and Michelin's non-starting entries at Indianapolis 2005.

Competition modes describe known starting suppliers per event, not contractual
exclusivity. Non-starting suppliers and incomplete identities have unknown
comparison mode. Observed victory rates do not identify causal tyre performance.


### Archive coverage

`/historia` connects drivers, constructors, engine manufacturers, circuits, driver
nationalities, tyres, Grand Prix names, and seasons. All 1,374 indexed entities have
an original statistical narrative, season charts, milestones, cross-links, and
source attribution. Driver profiles at `/pilotos/<id>` include full historical
classifications and the existing v7.6 model when available.

The archive is a reproducible 1950–2025 snapshot built from F1DB. It includes the
Indianapolis 500 championship rounds and entrants without starts. It covers 1,149
events with classification records; entry attempts without a recorded result may
be absent. The model covers 1,138 events. Expected and observed model wins are compared only
within the model's coverage. Grid P1 counts are labelled separately from official
pole records. Shared-car equipment credits are deduplicated.
The model's observed win credits come from its original ranking CSV, which
retains fractional credit for shared victories. They are separate from full
career win credits. The event table labels car win expectation separately from
the driver's XW expectation; missing probabilities remain missing.

Wikipedia is resolved by exact article title and enriched with structured Wikidata
facts and article chapters, with bounded requests, revision links, and a fallback
when unavailable. Original researched accounts for selected major figures are
maintained in `data/history-editorial.json` with references and review dates.
StatsF1 is a statistical and historical reference; its prose, images, and complete
database are not republished. Season and race articles include qualifying, grids,
sprint results where recorded, season balances and analytical model observations.
Leading-lap and leading-distance totals require a verified external table; the
available 1951 leading-lap table is attributed to STATS F1. Missing tables remain
unavailable rather than being represented as zero.

Rebuild from the parent F1 workspace's existing Python environment and F1DB cache:

```powershell
.\.venv\Scripts\python.exe telemetry-1\scripts\build-history.py
```

Use `--source` to specify another F1DB `src/data` checkout. Generated JSON is kept
in `public/history`; the generator preserves the cached F1DB Git revision in its
manifest. Next.js traces these files into the historical and driver routes for
deployment. The analytical model is consumed without refitting.

Validate the full generated archive with `npm run verify:history`. The numerical
edge-case tests run from the parent workspace with
`.\.venv\Scripts\python.exe telemetry-1\scripts\test-history.py`.

### Season, race and chassis articles

`/historia/seasons/[year]` is a championship article with expandable sections,
an entrants table, linked calendar, race/qualifying/grid matrices, statistics by
driver/constructor/engine/nation, official championship evolution and the model.
The section order follows the 2025 Wikipedia championship article, with the
STATS F1 balance and the TelemetryOne research added. All 1950–2025 races have
their own `/historia/carreras/[year]/[round]` dossier. The existing current-season
`/carreras/[round]` explorer retains its purpose.

`/historia/autos` indexes 1,140 named chassis from F1DB season entries. An entry
may declare several chassis, or fail to start; these associations are not exact
race-level model attribution. Car photographs and race posters retain their
source, author and license. Media coverage currently starts with two chassis
photographs and the documented 1950 Swiss Grand Prix poster.

Rebuild the snapshots from the parent workspace:

```powershell
.\.venv\Scripts\python.exe telemetry-1\scripts\build-weekends.py
.\.venv\Scripts\python.exe telemetry-1\scripts\enrich-weekends.py
```

`scripts/fetch-leading-stats.py` optionally refreshes attributed factual totals
from STATS F1. Its cached pages stay outside the public directory. A source error
never supplies numerical zeros. Researched original prose is currently provided
for selected seasons and races; other articles summarize their recorded facts
and link to Wikipedia for further reading.

`npm run verify:weekends` verifies 76 championships, 1,149 races, 25,317 model
observations, every chassis association and internal link, the full CSV schema,
shared wins, 1975 championship totals and the 2021 sprint pole rule. Raw model
downloads preserve all 213 columns of the current parquet file without fitting
or recalculating the model. Model-only probabilities, ELO and data-quality labels
are distinguished from official results and points.
