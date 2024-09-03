#!/usr/bin/env node
/**
 * Translate untranslated locales using `trans` utility
 *
 * Note: the path to the JSON file(s) must be passed as parameter(s)
 */

// dependencies
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// global constants
const STRING_NOT_TRANSLATED = "__STRING_NOT_TRANSLATED__";
const JSON_SPACES = 2;
const sourceLanguage = "en";
const encoding = "utf8";

process.argv.forEach((val, index) => {
  if (index < 2) return;
  const inputFile = val;
  const filePath = path.resolve(inputFile);
  
  (async() => {
    const actualLanguage = path.basename(path.dirname(filePath));

    // read the JSON file
    const json = fs.readFileSync(filePath, { encoding });

    const parsedData = JSON.parse(json);

    let stringsToParse = [];

    for (const key in parsedData) {
      // check if the value of the key is the placeholder string
      if (parsedData[key] === STRING_NOT_TRANSLATED) {
        stringsToParse.push({
          [key]: parsedData[key],
        });
      }
    }

    const translatedStringsParsed = stringsToParse.map((value, key) => {
      const string = Object.keys(value)[0];
      const stringEscaped = string.replace(/"/g, "\\\"");
      const command = `trans -brief -s ${sourceLanguage} -t ${actualLanguage} "${stringEscaped}"`;
      try {
        const translatedString = execSync(command).toString().trim();
        //console.log({string, translatedString})
        return { [string]: translatedString };
      } catch (err){ 
        console.error(err);
        console.log("sdterr:", err.stderr.toString());
        process.exit(-1);
      }
    });
    //console.log({translatedStringsParsed});

    const mappedObject = Object.fromEntries(
      Object.entries(parsedData).map(([key, value]) => {
        const translatedString = translatedStringsParsed.find((string) => string[key]);
        if (translatedString) {
          return [key, translatedString[key]];
        }
        return [key, value];
      })
    );

    // write into the JSON file
    fs.writeFileSync(filePath, JSON.stringify(mappedObject, null, JSON_SPACES));
  })();
});
