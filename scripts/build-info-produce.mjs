// (note: use yarn node --no-warnings)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fileName = "build-info-server.json";

const buildInfoPath = path.resolve(__dirname, "../client/build/", fileName); // WARNING: build info file in client/build path

// read the current build number or initialize it to 1 if the file doesn't exist
let buildNumber = 1;
if (fs.existsSync(buildInfoPath)) {
  buildNumber = parseInt(JSON.parse(fs.readFileSync(buildInfoPath, "utf8"))["buildNumber"], 10) + 1;
}
const buildTimestamp = new Date().toISOString();

// write the new build number and timestamp back to the file
fs.writeFileSync(buildInfoPath, JSON.stringify({
  buildNumber,
  buildTimestamp
}, null, 2) + "\n");
//console.log(`Bumped build number to ${buildNumber}`);
console.log(` (${buildNumber}, ${buildTimestamp})`);
