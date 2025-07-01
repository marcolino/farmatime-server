import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import OpenAI from "openai";

// load environment variables
config({ path: "./.env" });

const languages = [
  { name: "English", code: "en", source: true },
  { name: "Italian", code: "it" },
  { name: "French", code: "fr" },
];
  
const tagTranslationFromAI = "𐓙"; // prepend AI translated string with this tag, to point it out to human translators

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// function to translate text using OpenAI API
async function translateText(text, targetLanguageName = languages.find(l => l.source).name, targetLanguageCode = languages.find(l => l.source).code) {
  try {
    const messages = [
      {
        role: "system",
        content: `
          You are a professional translator.
          Translate all input text strictly and exclusively into ${targetLanguageName} (${targetLanguageCode}).
          Ensure no other language is used, and maintain accuracy and consistency.
          Please respect punctuation: do not add punctuations if not present in source text.
          Please treat phrases terminating with "_one" as the singular form of the phrase.
          Please treat phrases terminating with "_many" as the plural form of the phrase.
          Please treat phrases terminating with "_other" as the "other" (usually the same as plural) form of the phrase.
          Please keep strings inside "{{" and "}}" braces "as-is".
        `
      },
      { role: "user", content: text }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.0 // deterministic output
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error during translation: ${error.message}`);
    return text; // return original text in case of error
  }
}

// function to process translation file
async function processTranslationFile(filePath, targetLanguageName, targetLanguageCode) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`Error: File ${fullPath} does not exist.`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  const untranslatedKeys = Object.keys(data).filter(key => data[key] === "__STRING_NOT_TRANSLATED__");

  if (untranslatedKeys.length === 0) {
    console.log(`No ${targetLanguageName} untranslated strings found.`);
    return;
  }

  console.log(`Translating to ${targetLanguageName} ${untranslatedKeys.length} untranslated strings...`);

  for (const key of untranslatedKeys) {
    data[key] = tagTranslationFromAI + await translateText(key, targetLanguageName, targetLanguageCode);
  }

  const untranslatedBackup = fullPath.replace(".json", "_untranslated.json");
  fs.renameSync(fullPath, untranslatedBackup);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 4), "utf-8");

  //console.log(`Translation completed (original file renamed to ${untranslatedBackup}).`);
}

// real usage
(async () => {
  for (const { name, code, source } of languages) {
    if (!source) {
      await processTranslationFile(`../src/locales/${code}/translation.json`, name, code);
    }
  }
})();