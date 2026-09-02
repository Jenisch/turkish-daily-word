# Turkish Daily Word

A lightweight Turkish daily word game with deterministic word rotation, Unicode-aware input handling, and a responsive browser interface.

[Live demo](https://jenisch.github.io/turkish-daily-word/) · [MIT License](./LICENSE)

## Why this project

Word games become surprisingly subtle once Turkish casing and repeated-letter rules are involved. This project keeps those rules explicit and testable while staying deliberately small: no framework, no runtime dependencies, no backend, and no build step.

## Features

- One shared puzzle per calendar day, anchored to `Europe/Istanbul`
- Deterministic answer cycles with no repeat inside a complete cycle
- Locale-aware Turkish casing for `i / ı / İ / I`
- Five-letter validation against the Turkish alphabet
- Duplicate-safe Wordle-style scoring
- Six attempts with physical and on-screen Turkish keyboards
- Persistent daily progress and local statistics via `localStorage`
- Shareable emoji result grid
- Light/dark theme with system preference support
- Responsive and keyboard-accessible interface
- Automated tests on Node.js 20 and 22
- Automatic GitHub Pages deployment from `main`

## Architecture

```text
index.html
   └── src/game.js        browser state, rendering, keyboard, stats, sharing
          ├── src/core.js pure deterministic game rules
          └── src/words.js curated answer and accepted-guess pools

tests/core.test.mjs       selector, Turkish casing and scoring contracts
```

The game rules live in `src/core.js` and do not depend on the DOM. That keeps the date selector, normalization and scoring logic independently testable.

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

## Deployment

`.github/workflows/pages.yml` deploys the static repository to GitHub Pages whenever `main` changes. `.github/workflows/ci.yml` runs the test suite on pushes and pull requests.

If Pages has not been enabled for the repository yet, open **Settings → Pages** once and select **GitHub Actions** as the source. Future deployments are automatic.

## Privacy

The game has no analytics, accounts, cookies, remote API calls or server-side persistence. Game progress, theme choice and statistics remain in the browser's `localStorage`.

## License

MIT. See [LICENSE](./LICENSE).
