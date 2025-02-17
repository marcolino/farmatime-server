#!/usr/bin/env node

const fs = require("fs");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const sodium = require("libsodium-wrappers");


// configuration
const LOCAL_ENV_FILE = ".env";

// check if .env file exists
if (!fs.existsSync(LOCAL_ENV_FILE)) {
  console.error(`Error: .env file not found at ${LOCAL_ENV_FILE}`);
  process.exit(1);
}

// load environment variables
dotenv.config({ path: LOCAL_ENV_FILE });

// fetch GitHub public key
async function fetchPublicKey() {
  //console.log("Fetching GitHub public key...");
  const response = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/actions/secrets/public-key`,
    {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    console.error("Failed to fetch GitHub public key");
    process.exit(1);
  }

  const data = await response.json();
  return { key: data.key, keyId: data.key_id };
}

// encrypt a secret using the GitHub public key
async function encryptSecret(publicKey, secretValue) {
  await sodium.ready;
  const keyBytes = Buffer.from(publicKey, "base64");
  const secretBytes = Buffer.from(secretValue, "utf-8");
  const encryptedBytes = sodium.crypto_box_seal(secretBytes, keyBytes);
  return Buffer.from(encryptedBytes).toString("base64");
}

// upload encrypted secret to GitHub
async function uploadSecret(secretName, encryptedValue, keyId) {
  //console.log(`Uploading secret: ${secretName}...`);

  const response = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/actions/secrets/${secretName}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        encrypted_value: encryptedValue,
        key_id: keyId,
      }),
    }
  );

  if (!response.ok) {
    console.error(`Failed to upload secret '${secretName}'`);
    console.error(await response.text());
    return;
  }

  //console.log(`Secret '${secretName}' uploaded successfully`);
}

// main function to process secrets
async function processSecrets() {
  const { key, keyId } = await fetchPublicKey();

  const secretEntries = dotenv.parse(fs.readFileSync(".env"));

  for (const secretName of Object.keys(secretEntries)) {
    const secretValue = secretEntries[secretName];
    if (!secretName || !secretValue) {
      console.log(`Skipping invalid secret: ${secretName} = ${secretValue}`);
      continue;
    }

    if (secretName.startsWith("#")) {
      //console.log(`Skipping comment: ${secretName}`);
      continue;
    }

    if (secretName.startsWith("GITHUB_")) {
      //console.log(`Skipping github key: ${secretName}`);
      continue;
    }

    const encryptedValue = await encryptSecret(key, secretValue);
    await uploadSecret(secretName, encryptedValue, keyId);
  }

  console.log("All secrets uploaded successfully");
}

// run the script
processSecrets().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
