import { normalizeTurkishWord } from "./core.js";

export const TDK_GTS_ENDPOINT = "https://sozluk.gov.tr/gts?ara=";

export function tdkResponseHasEntry(payload) {
  return Array.isArray(payload) && payload.some((entry) => entry && typeof entry === "object" && entry.madde);
}

export function createDictionaryValidator(localWords, fetchImpl = globalThis.fetch) {
  const local = new Set([...localWords].map(normalizeTurkishWord));
  const remoteCache = new Map();

  return async function validateWord(value) {
    const word = normalizeTurkishWord(value);
    if (local.has(word)) return true;
    if (remoteCache.has(word)) return remoteCache.get(word);
    if (typeof fetchImpl !== "function") throw new Error("Dictionary service is unavailable.");

    const query = word.toLocaleLowerCase("tr-TR");
    const response = await fetchImpl(`${TDK_GTS_ENDPOINT}${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`Dictionary request failed with ${response.status}.`);

    const valid = tdkResponseHasEntry(await response.json());
    remoteCache.set(word, valid);
    return valid;
  };
}
