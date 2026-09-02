# Turkish Daily Word

A lightweight Turkish daily word game with deterministic word rotation, Unicode-aware input handling, and a responsive browser interface.

Created by **Kaan Atam**.

[Live demo](https://jenisch.github.io/turkish-daily-word/) · [Releases](https://github.com/Jenisch/turkish-daily-word/releases) · [MIT License](./LICENSE)

## Why this project

Word games become surprisingly subtle once Turkish casing, repeated-letter rules, and guess validation are involved. This project keeps those rules explicit and testable while staying deliberately small: no framework, no backend, and no build step.

## Features

- One shared puzzle per calendar day, anchored to `Europe/Istanbul`
- Deterministic answer cycles with no repeat inside a complete cycle
- Locale-aware Turkish casing for `i / ı / İ / I`
- Five-letter validation against the Turkish alphabet
- Dictionary-backed validation that rejects fabricated letter combinations
- Fast local validation for the bundled guess pool with a TDK dictionary fallback for missing words
- Duplicate-safe Wordle-style scoring
- Six attempts with physical and on-screen Turkish keyboards
- Persistent daily progress and local statistics via `localStorage`
- Shareable emoji result grid
- Light/dark theme with system preference support
- Responsive and keyboard-accessible interface
- Automated tests on Node.js 20 and 22
- Automatic GitHub Pages deployment from `main`
- Semantic Versioning and automated GitHub Releases

## Architecture

```text
index.html
   └── src/game.js        browser state, rendering, keyboard, stats, sharing
          ├── src/core.js       pure deterministic game rules
          ├── src/dictionary.js local-first dictionary validation
          └── src/words.js      curated answer and local guess pools

tests/core.test.mjs       selector, casing, scoring and dictionary contracts
```

The core game rules do not depend on the DOM. Date selection, normalization, scoring, and dictionary-response handling remain independently testable.

### Daily puzzle selection

The selector does not call `Math.random()` and does not depend on runtime RNG state.

1. The date is converted to an integer offset from a fixed epoch.
2. The answer pool is deterministically ordered for each cycle using a stable FNV-1a hash key.
3. Every answer appears exactly once before the next cycle begins.
4. The next cycle receives a different deterministic ordering.

The result is reproducible: the same date and answer set always resolve to the same word.

### Turkish text handling

Input is normalized with Unicode NFC and `toLocaleUpperCase("tr-TR")`. This is important because generic ASCII-oriented casing does not correctly model Turkish dotted and dotless I behavior.

Accepted letters are restricted to:

```text
ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ
```

### Guess validation

The bundled word pool handles common guesses immediately and without a network request. When a structurally valid five-letter guess is missing from that local pool, `src/dictionary.js` checks the public Güncel Türkçe Sözlük endpoint at `sozluk.gov.tr` and caches the result for the current browser session.

This keeps the static bundle small while avoiding false rejections for ordinary Turkish words. A failed dictionary request never consumes an attempt and never causes an unknown string to be accepted.

## Run locally

No installation is required for the game itself. Because the source uses ES modules, serve the repository through any static HTTP server instead of opening `index.html` through `file://`.

For example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Test

Node.js 20 or newer is recommended.

```bash
npm test
```

The tests verify:

- Turkish casing and alphabet validation
- answer-pool integrity
- stable answer selection for the same date
- full-cycle uniqueness
- deterministic reshuffling between cycles
- duplicate-safe letter evaluation
- local-first dictionary behavior
- positive and negative remote dictionary responses
- session caching of remote validation results

## Deployment

`.github/workflows/pages.yml` deploys the static repository to GitHub Pages whenever `main` changes. `.github/workflows/ci.yml` runs the test suite on pushes and pull requests.

## Releases

Stable milestones use [Semantic Versioning](https://semver.org/) with `vMAJOR.MINOR.PATCH` tags. `.github/workflows/release.yml` validates the version, runs the test suite, creates the tag, and publishes the GitHub Release.

- `PATCH` for backwards-compatible fixes
- `MINOR` for backwards-compatible features
- `MAJOR` for breaking changes or a substantial incompatible redesign

The first stable release is `v1.0.0`.

## Privacy

The game has no analytics, accounts, cookies, or server-side persistence. Game progress, theme choice, statistics, and dictionary-result cache remain in the browser. Guesses that are not already present in the bundled local pool are sent as dictionary lookup terms to `sozluk.gov.tr`; no account or game-state data is included in that request.

## License

MIT. Copyright (c) 2026 Kaan Atam. See [LICENSE](./LICENSE).
