// frontend/src/utils/cidEncryptor.js
// Encrypt/decrypt plain CID using AES-GCM with key = SHA256( phrase + recipientAddress )

export async function deriveKey(phrase, recipientAddress) {
  if (!phrase || !recipientAddress) throw new Error("deriveKey: missing phrase or address");
  const combo = phrase + recipientAddress.toLowerCase(); // normalize address
  const data = new TextEncoder().encode(combo);
  const hash = await crypto.subtle.digest("SHA-256", data); // 32 bytes
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptCid(cidString, phrase, recipientAddress) {
  const key = await deriveKey(phrase, recipientAddress);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(cidString);
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  const cipherBytes = new Uint8Array(cipherBuffer);
  const joined = new Uint8Array(iv.length + cipherBytes.length);
  joined.set(iv, 0);
  joined.set(cipherBytes, iv.length);
  // Base64 safe for storing as string in contract
  return btoa(String.fromCharCode(...joined));
}

export async function decryptCid(encryptedBase64, phrase, recipientAddress) {
  const key = await deriveKey(phrase, recipientAddress);
  const bytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const cipher = bytes.slice(12);
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(plainBuffer);
}
