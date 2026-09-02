import {
  MAX_GUESSES,
  TURKISH_LETTERS,
  WORD_LENGTH,
  answerForDate,
  evaluateGuess,
  isWinningGuess,
  normalizeTurkishWord,
  nextDateKey,
  puzzleDateKey,
} from "./core.js";
import { ALLOWED_WORDS, ANSWERS } from "./words.js";

const puzzleKey = puzzleDateKey();
const answer = answerForDate(puzzleKey, ANSWERS);
const allowed = new Set(ALLOWED_WORDS.map(normalizeTurkishWord));
const validLetters = new Set(Array.from(TURKISH_LETTERS));

const board = document.querySelector("#board");
const keyboard = document.querySelector("#keyboard");
const message = document.querySelector("#message");
const puzzleDate = document.querySelector("#puzzle-date");
const themeButton = document.querySelector("#theme-toggle");
const statsButton = document.querySelector("#stats-button");
const statsDialog = document.querySelector("#stats-dialog");
const statsClose = document.querySelector("#stats-close");
const shareButton = document.querySelector("#share-button");
const statsGrid = document.querySelector("#stats-grid");
const distribution = document.querySelector("#distribution");

const stateKey = `turkish-daily-word:state:${puzzleKey}`;
const statsKey = "turkish-daily-word:stats:v1";
const themeKey = "turkish-daily-word:theme";

const defaultState = () => ({ guesses: [], finished: false, won: false, statsRecorded: false });
const defaultStats = () => ({
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayedDate: null,
  lastWinDate: null,
  distribution: [0, 0, 0, 0, 0, 0],
});

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback(), ...JSON.parse(raw) } : fallback();
  } catch {
    return fallback();
  }
}

let state = readJson(stateKey, defaultState);
let stats = readJson(statsKey, defaultStats);
let currentGuess = "";
let messageTimer = null;

puzzleDate.textContent = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

function saveState() {
  localStorage.setItem(stateKey, JSON.stringify(state));
}

function saveStats() {
  localStorage.setItem(statsKey, JSON.stringify(stats));
}

function showMessage(text, persistent = false) {
  clearTimeout(messageTimer);
  message.textContent = text;
  message.dataset.visible = "true";
  if (!persistent) {
    messageTimer = window.setTimeout(() => {
      message.dataset.visible = "false";
    }, 1800);
  }
}

function tile(letter = "", status = "") {
  const element = document.createElement("div");
  element.className = "tile";
  element.textContent = letter;
  if (status) element.dataset.status = status;
  if (letter && !status) element.dataset.filled = "true";
  element.setAttribute("aria-label", status ? `${letter}, ${status}` : letter || "empty");
  return element;
}

function renderBoard() {
  board.replaceChildren();

  for (let row = 0; row < MAX_GUESSES; row += 1) {
    const rowElement = document.createElement("div");
    rowElement.className = "board-row";

    const submitted = state.guesses[row];
    const active = row === state.guesses.length && !state.finished;
    const letters = submitted
      ? Array.from(submitted)
      : active
        ? Array.from(currentGuess.padEnd(WORD_LENGTH, " "))
        : Array(WORD_LENGTH).fill("");
    const statuses = submitted ? evaluateGuess(submitted, answer) : [];

    for (let column = 0; column < WORD_LENGTH; column += 1) {
      rowElement.append(tile((letters[column] ?? "").trim(), statuses[column] ?? ""));
    }

    board.append(rowElement);
  }
}

const statusRank = { absent: 1, present: 2, correct: 3 };

function keyboardStatuses() {
  const statuses = new Map();
  for (const guess of state.guesses) {
    const result = evaluateGuess(guess, answer);
    Array.from(guess).forEach((letter, index) => {
      const next = result[index];
      const current = statuses.get(letter);
      if (!current || statusRank[next] > statusRank[current]) statuses.set(letter, next);
    });
  }
  return statuses;
}

const keyboardRows = [
  ["E", "R", "T", "Y", "U", "I", "O", "P", "Ğ", "Ü"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ş", "İ"],
  ["ENTER", "Z", "C", "V", "B", "N", "M", "Ö", "Ç", "BACKSPACE"],
];

function renderKeyboard() {
  const statuses = keyboardStatuses();
  keyboard.replaceChildren();

  for (const row of keyboardRows) {
    const rowElement = document.createElement("div");
    rowElement.className = "keyboard-row";
    for (const key of row) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "key";
      button.dataset.key = key;
      button.textContent = key === "BACKSPACE" ? "⌫" : key === "ENTER" ? "GİR" : key;
      button.setAttribute("aria-label", key === "BACKSPACE" ? "Sil" : key === "ENTER" ? "Tahmin et" : key);
      if (key.length > 1) button.classList.add("key-wide");
      const status = statuses.get(key);
      if (status) button.dataset.status = status;
      rowElement.append(button);
    }
    keyboard.append(rowElement);
  }
}

function render() {
  renderBoard();
  renderKeyboard();
  renderStats();
}

function recordStats() {
  if (state.statsRecorded) return;

  stats.played += 1;
  stats.lastPlayedDate = puzzleKey;

  if (state.won) {
    stats.wins += 1;
    const continued = stats.lastWinDate && nextDateKey(stats.lastWinDate) === puzzleKey;
    stats.currentStreak = continued ? stats.currentStreak + 1 : 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.lastWinDate = puzzleKey;
    const attemptIndex = Math.max(0, Math.min(5, state.guesses.length - 1));
    stats.distribution[attemptIndex] = (stats.distribution[attemptIndex] ?? 0) + 1;
  } else {
    stats.currentStreak = 0;
  }

  state.statsRecorded = true;
  saveStats();
  saveState();
}

function finish(won) {
  state.finished = true;
  state.won = won;
  saveState();
  recordStats();
  render();
  showMessage(won ? `Bildin: ${answer}` : `Kelime: ${answer}`, true);
  window.setTimeout(() => statsDialog.showModal(), 450);
}

function submitGuess() {
  if (state.finished) return;
  if (Array.from(currentGuess).length !== WORD_LENGTH) {
    showMessage("Beş harf gerekli.");
    return;
  }

  const guess = normalizeTurkishWord(currentGuess);
  if (!allowed.has(guess)) {
    showMessage("Kelime listesinde yok.");
    return;
  }

  state.guesses.push(guess);
  currentGuess = "";
  saveState();

  if (isWinningGuess(guess, answer)) {
    finish(true);
    return;
  }

  if (state.guesses.length >= MAX_GUESSES) {
    finish(false);
    return;
  }

  render();
}

function inputLetter(raw) {
  if (state.finished || Array.from(currentGuess).length >= WORD_LENGTH) return;
  const letter = normalizeTurkishWord(raw);
  if (Array.from(letter).length !== 1 || !validLetters.has(letter)) return;
  currentGuess += letter;
  renderBoard();
}

function backspace() {
  if (state.finished || !currentGuess) return;
  const letters = Array.from(currentGuess);
  letters.pop();
  currentGuess = letters.join("");
  renderBoard();
}

function handleKey(key) {
  if (key === "ENTER") submitGuess();
  else if (key === "BACKSPACE") backspace();
  else inputLetter(key);
}

keyboard.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-key]");
  if (button) handleKey(button.dataset.key);
});

document.addEventListener("keydown", (event) => {
  if (statsDialog.open) return;
  if (event.key === "Enter") {
    event.preventDefault();
    handleKey("ENTER");
  } else if (event.key === "Backspace") {
    event.preventDefault();
    handleKey("BACKSPACE");
  } else if (event.key.length === 1) {
    inputLetter(event.key);
  }
});

function renderStats() {
  const winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const values = [
    [stats.played, "Oynanan"],
    [`%${winRate}`, "Kazanma"],
    [stats.currentStreak, "Seri"],
    [stats.maxStreak, "En iyi"],
  ];

  statsGrid.replaceChildren(...values.map(([value, label]) => {
    const item = document.createElement("div");
    item.className = "stat";
    item.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
    return item;
  }));

  const max = Math.max(1, ...stats.distribution);
  distribution.replaceChildren(...stats.distribution.map((count, index) => {
    const row = document.createElement("div");
    row.className = "distribution-row";
    row.innerHTML = `<span>${index + 1}</span><div><i style="width:${Math.max(8, (count / max) * 100)}%">${count}</i></div>`;
    return row;
  }));

  shareButton.hidden = !state.finished;
}

function shareText() {
  const score = state.won ? state.guesses.length : "X";
  const rows = state.guesses.map((guess) =>
    evaluateGuess(guess, answer)
      .map((status) => ({ correct: "🟩", present: "🟨", absent: "⬛" })[status])
      .join(""),
  );
  return `Turkish Daily Word ${puzzleKey} ${score}/${MAX_GUESSES}\n\n${rows.join("\n")}`;
}

shareButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareText());
    showMessage("Sonuç panoya kopyalandı.");
    statsDialog.close();
  } catch {
    showMessage("Kopyalama izni alınamadı.");
  }
});

statsButton.addEventListener("click", () => statsDialog.showModal());
statsClose.addEventListener("click", () => statsDialog.close());
statsDialog.addEventListener("click", (event) => {
  if (event.target === statsDialog) statsDialog.close();
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.textContent = theme === "dark" ? "☀" : "☾";
  themeButton.setAttribute("aria-label", theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç");
}

const savedTheme = localStorage.getItem(themeKey);
const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
applyTheme(savedTheme || preferredTheme);

themeButton.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(themeKey, next);
  applyTheme(next);
});

if (state.finished) {
  recordStats();
  showMessage(state.won ? `Bildin: ${answer}` : `Kelime: ${answer}`, true);
}

render();
