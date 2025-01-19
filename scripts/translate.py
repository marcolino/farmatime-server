#!/usr/bin/env python
#
# translate JSON using AI - openai-0.27.2 (max) is requested

import os
from dotenv import load_dotenv
import json
from pathlib import Path
import openai


load_dotenv("./.env") # load environment from server side

openai.api_key = os.getenv("OPENAI_API_KEY") # get OpenAI API key

# function to translate text using OpenAI API
def translate_text(text, target_language_name="English", target_language_code="en"):
  try:
    messages = [
      {
        "role": "system",
        "content": (
          f"You are a professional translator. Translate all input text strictly and exclusively into {target_language_name} ({target_language_code}). "
          "Ensure no other language is used, and maintain accuracy and consistency. "
          "Please respect punctuation: do not add punctuations if not present in source text."
        ),
      },
      {"role": "user", "content": text},
    ]

    response = openai.ChatCompletion.create(
      model="gpt-3.5-turbo",
      messages=messages,
      temperature=0.0 # set temperature to 0 for deterministic output
    )

    # extract the translation from the response
    translation = response["choices"][0]["message"]["content"].strip()
    return translation

  except Exception as e:
    print(f"Error during translation: {e}")
    return text # return the original text in case of an error

def process_translation_file(file_path, target_language_name, target_language_code):
  file_path = Path(file_path)

  if not file_path.exists():
    print(f"Error: File {file_path} does not exist.")
    return

  with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

  untranslated_keys = [key for key, value in data.items() if value == "__STRING_NOT_TRANSLATED__"]

  if not untranslated_keys:
    print(f"No {target_language_name} untranslated strings found.")
    return

  print(f"Translating to {target_language_name} {len(untranslated_keys)} untranslated strings...")

  for key in untranslated_keys:
    # perform translation
    translated_value = translate_text(key, target_language_name, target_language_code)
    # prefix the translated value with the special character "𐓙"
    data[key] = f"𐓙{translated_value}"

  # rename old file
  untranslated_backup = file_path.parent / f"{file_path.stem}_untranslated.json"
  os.rename(file_path, untranslated_backup)

  # write the new file with translations
  with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

  print(f"Translation completed (original file renamed to {untranslated_backup}).")

# real usage
if __name__ == "__main__":
  target_language_name = "Italian" # target language name
  target_language_code = "it" # target language code
  file_path = f"src/locales/{target_language_code}/translation.json"
  process_translation_file(file_path, target_language_name, target_language_code)

  target_language_name = "French" # target language name
  target_language_code = "fr" # target language code
  file_path = f"src/locales/{target_language_code}/translation.json"
  process_translation_file(file_path, target_language_name, target_language_code)
