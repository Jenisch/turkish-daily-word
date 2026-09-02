import test from "node:test";
import assert from "node:assert/strict";

import {
  answerForDate,
  deterministicCycle,
  evaluateGuess,
  isValidTurkishWord,
  nextDateKey,
  normalizeTurkishWord,
} from "../src/core.js";
import { createDictionaryValidator, tdkResponseHasEntry } from "../src/dictionary.js";
import { ALLOWED_WORDS, ANSWERS } from "../src/words.js";

test("Turkish casing keeps dotted and dotless i semantics", () => {
  assert.equal(normalizeTurkishWord("şehir"), "ŞEHİR");
  assert.equal(normalizeTurkishWord("kırık"), "KIRIK");
  assert.equal(normalizeTurkishWord("  içeri  "), "İÇERİ");
});

test("word validation accepts only five Turkish letters", () => {
  assert.equal(isValidTurkishWord("ŞEHİR"), true);
  assert.equal(isValidTurkishWord("KÖPRÜ"), true);
  assert.equal(isValidTurkishWord("QWERT"), false);
  assert.equal(isValidTurkishWord("ALTI"), false);
});

test("curated pools contain only valid five-letter Turkish words", () => {
  assert.ok(ANSWERS.length >= 300);
  assert.ok(ALLOWED_WORDS.length > ANSWERS.length);
  for (const word of ALLOWED_WORDS) {
    assert.equal(isValidTurkishWord(word), true, `Invalid entry: ${word}`);
  }
});

test("same date always resolves to the same answer", () => {
  const date = "2026-09-02";
  assert.equal(answerForDate(date, ANSWERS), answerForDate(date, ANSWERS));
});

test("a complete cycle uses every answer exactly once", () => {
  const start = "2026-01-01";
  const seen = new Set();
  let date = start;

  for (let index = 0; index < ANSWERS.length; index += 1) {
    seen.add(answerForDate(date, ANSWERS));
    date = nextDateKey(date);
  }

  assert.equal(seen.size, new Set(ANSWERS).size);
});

test("successive cycles are deterministic but differently ordered", () => {
  const first = deterministicCycle(ANSWERS, 0);
  const firstAgain = deterministicCycle(ANSWERS, 0);
  const second = deterministicCycle(ANSWERS, 1);

  assert.deepEqual(first, firstAgain);
  assert.notDeepEqual(first, second);
  assert.deepEqual([...first].sort(), [...second].sort());
});

test("guess evaluation is position-aware and duplicate-safe", () => {
  assert.deepEqual(evaluateGuess("BALIK", "BALIK"), [
    "correct",
    "correct",
    "correct",
    "correct",
    "correct",
  ]);

  assert.deepEqual(evaluateGuess("KABAK", "BALIK"), [
    "absent",
    "correct",
    "present",
    "absent",
    "correct",
  ]);

  assert.deepEqual(evaluateGuess("KAPAK", "KABAK"), [
    "correct",
    "correct",
    "absent",
    "correct",
    "correct",
  ]);
});

test("dictionary response parser distinguishes entries from not-found payloads", () => {
  assert.equal(tdkResponseHasEntry([{ madde: "kağıt" }]), true);
  assert.equal(tdkResponseHasEntry({ error: "Sonuç bulunamadı" }), false);
  assert.equal(tdkResponseHasEntry([]), false);
});

test("dictionary validator keeps local guesses offline and checks missing words remotely", async () => {
  const requests = [];
  const fetchMock = async (url) => {
    requests.push(url);
    const isRealWord = url.includes("ka%C4%9F%C4%B1t");
    return {
      ok: true,
      json: async () => (isRealWord ? [{ madde: "kağıt" }] : { error: "Sonuç bulunamadı" }),
    };
  };

  const validate = createDictionaryValidator(ALLOWED_WORDS, fetchMock);

  assert.equal(await validate("BALIK"), true);
  assert.equal(requests.length, 0, "known local guesses should not make a network request");

  assert.equal(await validate("KAĞIT"), true);
  assert.equal(await validate("ŞYAOF"), false);
  assert.equal(requests.length, 2);

  assert.equal(await validate("KAĞIT"), true);
  assert.equal(requests.length, 2, "remote results should be cached for the session");
});
