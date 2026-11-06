const fs = require('fs');
let txt = fs.readFileSync('lib/f1-data.ts', 'utf8');
txt = txt.replace(/<<<<<<< HEAD[\s\S]*?=======\s*(import \{ translate \} from "\.\/dictionary";)\s*>>>>>>>.*?\n/, 'import { driverPhoto, driverPhotosByName } from "./driver-photos";\n$1\n');
fs.writeFileSync('lib/f1-data.ts', txt);
