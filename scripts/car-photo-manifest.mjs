// Lists the car photos present in public/history/car-photos so pages only reserve space for real images.
// Runs before every build (npm "prebuild"); dropping a <model id>.jpg in the folder is all it takes.
import { readdirSync, writeFileSync } from "node:fs";

const files = readdirSync(new URL("../public/history/car-photos/", import.meta.url)).filter(name => /\.jpe?g$/i.test(name) && !name.startsWith("."));
const ids = files.filter(name => name.endsWith(".jpg")).map(name => name.slice(0, -4)).sort();
writeFileSync(new URL("../lib/car-photo-files.json", import.meta.url), JSON.stringify(ids, null, 2) + "\n");
console.log(`car-photo-manifest: ${ids.length} photos`);
