const crypto = require("crypto");
const i18n = require("../middlewares/i18n");

const createEncryptionKey = async (user) => {
  // create a base-64 encryption key from the user's DB ID + server secret
  return crypto.pbkdf2Sync(
    user._id.toString(), // Immutable user ID
    process.env.ENCRYPTION_KEY_SECRET, // Server-side pepper
    100000, // Iterations
    32, // Key length (32 bytes = AES-256)
    "sha512" // Hash algorithm
  ).toString("base64");
};

const encryptData = async (value, encryptionKey) => {
  if (!encryptionKey) {
    throw new Error(i18n.t('No encryption key for user'));
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const key = await importKey(encryptionKey);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted)),
  };
};

const decryptData = async (iv, data, encryptionKey) => {
  if (!encryptionKey) {
    throw new Error(i18n.t('No encryption key for user'));
  }
  const key = await importKey(encryptionKey);
  //const key = encryptionKey; // TODO: solve html entities in snackbar errors
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(data)
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
};

const importKey = async (base64Key) => {
  const rawKey = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};
  
module.exports = {
  createEncryptionKey,
  encryptData,
  decryptData,
};