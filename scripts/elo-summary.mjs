// Builds lib/elo-ratings.json: the v7.6 model summary of every driver profile, so pages can
// rank drivers by ELO without reading hundreds of driver files. Run: node scripts/elo-summary.mjs
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const folder = path.join(process.cwd(), "public/history/drivers");
const summary = {};
for (const file of (await readdir(folder)).filter(name => name.endsWith(".json"))) {
  const driver = JSON.parse(await readFile(path.join(folder, file), "utf8"));
  const model = driver.model?.model;
  if (!model?.careerRating) continue;
  const peak = driver.ratingHistory?.reduce((best, r) => r.rating > best.rating ? r : best, { rating: 0 });
  summary[driver.id] = {
    name: driver.name, rank: model.rank ?? null, careerRating: model.careerRating, sustainedPrime: model.sustainedPrime ?? null,
    peakRating: peak?.rating ? Math.round(peak.rating * 10) / 10 : null, peakSeason: peak?.season ?? null,
    expectedWins: model.expectedWins ?? null, observedWins: model.observedWins ?? null, winsAboveExpected: model.winsAboveExpected ?? null
  };
}
await writeFile(path.join(process.cwd(), "lib/elo-ratings.json"), JSON.stringify(summary));
console.log(`${Object.keys(summary).length} drivers with a v7.6 rating`);
