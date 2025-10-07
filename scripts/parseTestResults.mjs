import fs from "fs";
//import xml2js from "xml2js";

const testResultsFile = "./test/tmp/mocha-results.json";
const readmeFile = "./README.md";

if (!fs.existsSync(testResultsFile)) {
  console.error(`Test results file ${testResultsFile} not found!`);
  process.exit(1);
}

// Read the JSON file
const rawData = await fs.promises.readFile(testResultsFile, "utf-8");

// Parse it
const json = JSON.parse(rawData);

// Extract the number of passed tests
const testsPassed = json.stats?.passes ?? 0;

console.log(`Passed tests: ${testsPassed}`);

// update README dile
const badgeUrl = `https://img.shields.io/badge/tests%20passed-${testsPassed}-brightgreen`;
const readmeContent = fs.readFileSync(readmeFile, "utf8");
const updatedReadme = readmeContent.replace(
  /!\[Tests Passed\]\(.*\)/,
  `![Tests Passed](${badgeUrl})`
);
fs.writeFileSync(readmeFile, updatedReadme);

process.exit(0);