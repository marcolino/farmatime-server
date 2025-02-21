import fs from "fs";
import xml2js from "xml2js";

const testResultsFile = "./test/test-results.xml";
const readmeFile = "./README.md";

if (!fs.existsSync(testResultsFile)) {
  console.error(`Test results file ${testResultsFile} not found!`);
  process.exit(1);
}

const parser = new xml2js.Parser();
const xml = fs.readFileSync(testResultsFile);

parser.parseString(xml, (err, result) => {
  if (err) {
    console.error("Error parsing XML:", err);
    process.exit(1);
  }

  const testsuite = result.testsuites; //.testsuite[0];
  const passedTests = testsuite.$.tests - testsuite.$.failures;
  console.log(`Passed tests: ${passedTests}`);

  // update README dile
  const badgeUrl = `https://img.shields.io/badge/tests%20passed-${passedTests}-brightgreen`;
  const readmeContent = fs.readFileSync(readmeFile, "utf8");
  const updatedReadme = readmeContent.replace(
    /!\[Tests Passed\]\(.*\)/,
    `![Tests Passed](${badgeUrl})`
  );
  fs.writeFileSync(readmeFile, updatedReadme);
});