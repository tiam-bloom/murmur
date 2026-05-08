import FingerprintJS from "@fingerprintjs/fingerprintjs";

const STORAGE_KEY = "murmur_fp_hash";

async function computeHash(visitorId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(visitorId);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getOrCreateFingerprint(): Promise<string> {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) return cached;

  const fp = await FingerprintJS.load();
  const result = await fp.get();
  const hash = await computeHash(result.visitorId);
  localStorage.setItem(STORAGE_KEY, hash);
  return hash;
}

export function getStoredFingerprint(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}
