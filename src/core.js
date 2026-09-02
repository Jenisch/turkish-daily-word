export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
export const PUZZLE_EPOCH = "2026-01-01";
export const PUZZLE_TIME_ZONE = "Europe/Istanbul";
export const TURKISH_LETTERS = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";

const letterSet = new Set(Array.from(TURKISH_LETTERS));

export function normalizeTurkishWord(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .toLocaleUpperCase("tr-TR");
}

export function isValidTurkishWord(value) {
  const normalized = normalizeTurkishWord(value);
  const letters = Array.from(normalized);
  return letters.length === WORD_LENGTH && letters.every((letter) => letterSet.has(letter));
}

export function puzzleDateKey(date = new Date(), timeZone = PUZZLE_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function utcDayNumber(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new Error(`Invalid date key: ${dateKey}`);
  const [, year, month, day] = match.map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function daysFromEpoch(dateKey, epoch = PUZZLE_EPOCH) {
  return utcDayNumber(dateKey) - utcDayNumber(epoch);
}

export function fnv1a32(input) {
  let hash = 0x811c9dc5;
  for (const character of String(input)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function deterministicCycle(words, cycle = 0) {
  const unique = [...new Set(words.map(normalizeTurkishWord).filter(isValidTurkishWord))];
  return unique
    .map((word) => ({
      word,
      key: fnv1a32(`turkish-daily-word:v1|${cycle}|${word}`),
    }))
    .sort((a, b) => a.key - b.key || a.word.localeCompare(b.word, "tr-TR"))
    .map(({ word }) => word);
}

export function answerForDate(dateKey, words) {
  const cleanWords = [...new Set(words.map(normalizeTurkishWord).filter(isValidTurkishWord))];
  if (cleanWords.length === 0) throw new Error("Answer pool cannot be empty.");

  const offset = daysFromEpoch(dateKey);
  const normalizedOffset = ((offset % cleanWords.length) + cleanWords.length) % cleanWords.length;
  const cycle = Math.floor((offset - normalizedOffset) / cleanWords.length);
  const order = deterministicCycle(cleanWords, cycle);
  return order[normalizedOffset];
}

export function evaluateGuess(guess, answer) {
  const normalizedGuess = normalizeTurkishWord(guess);
  const normalizedAnswer = normalizeTurkishWord(answer);
  if (!isValidTurkishWord(normalizedGuess) || !isValidTurkishWord(normalizedAnswer)) {
    throw new Error("Guess and answer must be valid five-letter Turkish words.");
  }

  const guessLetters = Array.from(normalizedGuess);
  const answerLetters = Array.from(normalizedAnswer);
  const statuses = Array(WORD_LENGTH).fill("absent");
  const remaining = new Map();

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (guessLetters[index] === answerLetters[index]) {
      statuses[index] = "correct";
    } else {
      remaining.set(answerLetters[index], (remaining.get(answerLetters[index]) ?? 0) + 1);
    }
  }

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (statuses[index] === "correct") continue;
    const letter = guessLetters[index];
    const count = remaining.get(letter) ?? 0;
    if (count > 0) {
      statuses[index] = "present";
      remaining.set(letter, count - 1);
    }
  }

  return statuses;
}

export function isWinningGuess(guess, answer) {
  return normalizeTurkishWord(guess) === normalizeTurkishWord(answer);
}

export function nextDateKey(dateKey) {
  const day = utcDayNumber(dateKey) + 1;
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}
