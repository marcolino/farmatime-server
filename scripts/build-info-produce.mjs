// (note: use yarn node --no-warnings)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const buildInfoServerBaseDir = "../dev/build/";
const buildInfoClientBaseDir = "../client/build/";
const fileName = "build-info-server.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const buildInfoServerDir = path.resolve(__dirname, buildInfoServerBaseDir);
const buildInfoClientDir = path.resolve(__dirname, buildInfoClientBaseDir);

// create buildInfoServerDir if it does not exist yet
fs.mkdirSync(buildInfoServerDir, { recursive: true });

const buildInfoServerFilename = path.resolve(buildInfoServerDir, fileName);
const buildInfoClientFilename = path.resolve(buildInfoClientDir, fileName);

// read the current build number or initialize it to 1 if the file doesn't exist
let buildNumber = 1;
if (fs.existsSync(buildInfoServerFilename)) {
  //console.log(`Current build info: ${fs.readFileSync(buildInfoServerFilename, "utf8")}`);
  buildNumber = parseInt(JSON.parse(fs.readFileSync(buildInfoServerFilename, "utf8"))["buildNumber"], 10) + 1;
}
//console.log(`Bumping build number to ${buildNumber}`);
const buildTimestamp = new Date().toISOString();

// write the new build number and timestamp back to the file
fs.writeFileSync(buildInfoServerFilename, JSON.stringify({
  buildNumber,
  buildTimestamp
}, null, 2) + "\n");
//console.log(` (${buildNumber}, ${buildTimestamp})`);

// Copy build file to client build
try {
  fs.copyFileSync(buildInfoServerFilename, buildInfoClientFilename);
  console.log(`${path.basename(buildInfoServerFilename)} was copied to ${path.basename(buildInfoClientFilename)}`);
} catch (err) {
  console.error(`Error copying file ${buildInfoServerFilename} to ${buildInfoClientFilename}:`, err.message);
}
