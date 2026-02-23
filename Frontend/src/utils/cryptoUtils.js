// cryptoUtils.js (browser) — corrected + logging
export async function generateAesKey() {
  return window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportAesKeyHex(key) {
  const raw = await window.crypto.subtle.exportKey("raw", key); 
  const u8 = new Uint8Array(raw);
  return Array.from(u8).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function importAesKeyFromHex(hex) {
  const bytes = Uint8Array.from(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
  return window.crypto.subtle.importKey("raw", bytes.buffer, "AES-GCM", true, ["encrypt", "decrypt"]);
}

/**
 * Encrypt an ArrayBuffer with AES-GCM. Returns { iv: Uint8Array, cipher: Uint8Array }.
 */
export async function encryptBufferWithAes(arrayBuffer, aesKey) {
  if (!(arrayBuffer && arrayBuffer.byteLength)) {
    throw new Error("encryptBufferWithAes: input arrayBuffer is empty");
  }
  // 96-bit IV (12 bytes) recommended for AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    arrayBuffer
  );
  const cipher = new Uint8Array(cipherBuffer);
  // Sanity checks
  if (cipher.byteLength === 0) throw new Error("encryptBufferWithAes: cipher length is 0");
  return { iv, cipher };
}

/**
 * Combine iv (Uint8Array) + cipher (Uint8Array) into a single Uint8Array
 */
export function combineIvAndCipher(ivUint8, cipherUint8) {
  if (!(ivUint8 && cipherUint8)) throw new Error("combineIvAndCipher: iv or cipher missing");
  const combined = new Uint8Array(ivUint8.length + cipherUint8.length);
  combined.set(ivUint8, 0);
  combined.set(cipherUint8, ivUint8.length);
  return combined;
}


export async function decryptBufferWithAes(cipherArrayBuffer, ivUint8, aesKey) {
  // cipherArrayBuffer can be ArrayBuffer or Uint8Array.buffer
  const plain = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivUint8 },
    aesKey,
    cipherArrayBuffer
  );
  return new Uint8Array(plain);
}

/**
 * SHA-256 hex
 */
export async function sha256Hex(arrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}
