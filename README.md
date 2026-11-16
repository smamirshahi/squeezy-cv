# Squeezy CV

Keep everything. Squeeze what fits. A personal CV app. You keep all your facts once (the **vault**), then make a **job** for each application. A job picks a **template** (the look: layout, fonts, page limit) and decides what to show. Check it on a live A4 preview and export a PDF. Optional AI can help tailor a job to an advert.

- **Web app:** React 19, TypeScript, Vite, MUI, Redux Toolkit.
- **Local server:** Fastify. It stores your data as JSON files on your computer and makes the PDF with headless Chromium.
- **Everything runs locally.** Nothing leaves your machine unless you choose an online AI provider.

## Using it without installing anything (browser version)

The same app can run as a website that keeps your data in your own browser: no Node, no server, nothing to install. Build it with `pnpm build:browser` (or run it with `pnpm dev:browser`). It is hosted on Cloudflare Pages, see [docs/hosting.md](docs/hosting.md) for the address, how to change who may log in, what deploys when (merging to `main` deploys automatically) and why the address must not change. Local development with `pnpm dev` is unchanged. Inside the app, About → "How to use" and "Privacy note" explain it for users. The rest of this README is about the developer (server) version.

## 1. Prepare your computer

Install these once.

| Tool                                       | Why                                     | How                                                                                                                        |
| ------------------------------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Git**                                    | clone the project; optional data backup | macOS: `xcode-select --install` or `brew install git`                                                                      |
| **Node.js** (current LTS, 22 or newer)     | runs the app and the server             | <https://nodejs.org> or `brew install node` (check with `node -v`)                                                         |
| **pnpm**                                   | package manager (the project uses it)   | `corepack enable` (comes with Node), or `npm install -g pnpm`                                                              |
| **Chromium for Playwright** (about 110 MB) | PDF export and the browser tests        | after installing the dependencies: `pnpm exec playwright install chromium` (goes to the Playwright cache, not to the repo) |
| **Ollama** (optional)                      | free AI that runs on your computer      | see [AI setup](#3-optional-ai-setup)                                                                                       |

Then:

```bash
git clone <this repo's URL> squeezy-cv
cd squeezy-cv
pnpm install
pnpm exec playwright install chromium
```

## 2. Run it

```bash
pnpm dev
```

- Web app: <http://localhost:5173>
- API server: <http://localhost:3001> (Vite forwards `/api` to it)

On the first start there is no saved CV. In development the app shows a fake sample CV (unsaved) so you can try it. To start with your own data, use **Import JSON**, **Paste CV text** (AI) or type it in, then press **Save**.

**PDF export** needs two things: Chromium installed (step 1) and the web app running (the server opens it in a headless browser).

### Configuration

The server reads these environment variables (put them in `.env`, see below):

| Variable   | Default                 | Meaning                                       |
| ---------- | ----------------------- | --------------------------------------------- |
| `PORT`     | `3001`                  | server port                                   |
| `DATA_DIR` | `./data`                | where your CV files are saved                 |
| `WEB_URL`  | `http://localhost:5173` | where the web app runs (must be this machine) |

### Commands

| Command             | What it does                                                                        |
| ------------------- | ----------------------------------------------------------------------------------- |
| `pnpm dev`          | web and server together. `pnpm dev:web` or `pnpm dev:server` runs only one          |
| `pnpm server`       | run the server once, without watching                                               |
| `pnpm build`        | type-check and build the web app                                                    |
| `pnpm test`         | unit and component tests (Vitest). `pnpm test:watch` to keep it running             |
| `pnpm test:e2e`     | real-browser tests (starts its own server on a temporary folder, Vite and Chromium) |
| `pnpm lint:check`   | ESLint, no changes (CI runs this). `pnpm lint` fixes                                |
| `pnpm format-check` | Prettier check. `pnpm format-fix` fixes                                             |
| `pnpm data:push`    | push the data repo to its remote (see [Backup](#backup-with-git-optional))          |

CI runs build, lint, format check and tests on every pull request.

## 3. Optional: AI setup

The AI helps with tailoring a job to an advert, pasting CV text, choosing what to hide to fit the page limit, and the chat panel. **The app works fully without it.** Every change the AI suggests is shown first and only applied when you approve it.

Copy the example settings file and edit it. `.env` is git-ignored, and only the server reads it. Keys are never sent to the browser.

```bash
cp .env.example .env
```

You can use any of these providers. In the app, **AI setup** (left rail) lets you choose the provider per task. A provider only appears there when it is set up.

| Provider   | Cost      | Where your text goes              | Setup in `.env`                                      |
| ---------- | --------- | --------------------------------- | ---------------------------------------------------- |
| **Ollama** | free      | stays on your computer            | `AI_PROVIDER=ollama` (no key)                        |
| **Claude** | paid      | Anthropic                         | `ANTHROPIC_API_KEY=...` (optional `ANTHROPIC_MODEL`) |
| **Gemini** | free tier | Google (may be used for training) | `GEMINI_API_KEY=...`                                 |
| **Groq**   | free tier | Groq (check their data terms)     | `GROQ_API_KEY=...`                                   |

Restart `pnpm dev` after changing `.env`.

**Groq models.** Groq changes which models a key can use, and some (such as the Llama ones marked "Enterprise / Contact Sales") answer `404 model does not exist` on a normal key. The current list is at <https://console.groq.com/docs/models>. Pick a model that is listed under Production Models without "Contact Sales" and set it in `.env`, for example `GROQ_MODEL=openai/gpt-oss-120b` (the default; `openai/gpt-oss-20b` is smaller and faster). If you get a 404, check that page first.

Before anything is sent to an online provider, a **Send to AI** window shows the exact text. Your name, email, phone, address, links, employers and schools are already replaced with placeholders (`[Company 1]`); you can switch each off, select any other word or phrase to hide it everywhere, and mark a job advert as private. The model's answer gets the real words back on your computer. Dates and wording are still sent, so they can identify you. For anything sensitive, use Ollama, which stays on your computer and shows no window.

### Installing Ollama (local, free, private)

1. Install it from <https://ollama.com> (on macOS also `brew install ollama`).
2. Make sure it is running (the desktop app starts it, or run `ollama serve`).
3. Download a model (a few GB):

   ```bash
   ollama pull llama3.1
   ```

4. In `.env` set `AI_PROVIDER=ollama`, then restart `pnpm dev`.

Optional settings: `OLLAMA_MODEL` (default `llama3.1`), `OLLAMA_URL` (default `http://127.0.0.1:11434`, must be this machine), `OLLAMA_NUM_CTX` (default `16384`; a CV and its prompt need a large context).

Local models on a CPU are slow, often several minutes per request. A smaller model such as `llama3.2:3b` is much faster but gives weaker results. A hosted model (Claude) is faster and better.

## 4. Where things are saved

Your real data lives in **`data/`** inside the project (or in `DATA_DIR`). It is git-ignored so personal details are never committed.

```text
data/
  vault.json                       all your facts: profile, links, sections, items, bullets
  vault.json.bak                   the previous readable version
  templates/<id>.json              a look: layout, style, page limit, skill display
  jobs/<id>.json                   one target: its template, which items are shown, order, wording
  applications/<id>/
    application.json               one application: company, role, status, timeline, the CV as sent
    cv.pdf                         the exact PDF that was sent
```

- **Old data (before 0.2):** `variants/<id>.json` files are still read. Each one shows up as a template plus a job with the same name, and is written out to `templates/` and `jobs/` the first time you save. The old files are never deleted.
- **Nothing is saved automatically.** The **Save** button writes what changed. If you close the tab with unsaved changes, the browser warns you.
- Writes are atomic (temporary file, then rename). The last good version is kept as `.bak`. A file that cannot be read is moved to `.corrupt-<time>` and is never treated as empty, and saving is blocked while the data cannot be read, so the empty default CV never overwrites a file.
- Export and import: **Export PDF** downloads a PDF (optionally also JSON). The Settings pages import and export a JSON file. Older export formats are migrated automatically.
- `data.example/` shows the layout with a fake CV. To start from it: copy that folder to `data/`.
- Other local files, all git-ignored: `.env` (settings and keys), `.ai-settings.json` (which provider you chose per task, no secrets), and the chat history per job, kept in your browser's `localStorage`.

### Backup with git (optional)

Make `data/` its own **private** repository:

```bash
cd data
git init
git remote add origin <your PRIVATE repo URL>
```

Once `data/` has its own `.git`, the server commits after every save. Pushing is always explicit: `pnpm data:push` (or `POST /api/backup/push`). If git fails, saving still works. Never put your CV in a public repository.

## 5. Project structure

```text
src/
  web/      the React app (entry: main.tsx)
    components/  shared UI pieces
    custom-styles/  theme, fonts, colours
    hooks/       React hooks
    pages/       workspace, editors, preview, tailor (AI), applications, print view
    store/       Redux slices: vault, cvData, app, variants (holds the templates and jobs), persistence, history
  server/   the local API (Fastify; entry: main.ts)
    storage/     reading and writing the JSON files
    pdf/         PDF export with Playwright and Chromium
    ai/          AI providers, prompts (ai/prompts/*.md), tailoring, import, chat
    backup/      optional git commits of the data folder
  shared/   code used by both sides (no React, Redux or Node APIs)
    custom-types/  the runtypes schemas
    vault/  variant/  layout/  ai/  application/  export/  chat/   pure logic
  e2e/      real-browser tests (pnpm test:e2e)
fixtures/       fake data for tests
data.example/   example data layout
data/           YOUR data (git-ignored)
.env            YOUR settings and keys (git-ignored)
```

Tests sit next to the code as `*.test.ts(x)`.

Imports must use path aliases, not relative paths (ESLint enforces it): `@components/*`, `@hooks/*`, `@pages/*`, `@store/*`, `@custom-styles/*`, `@shared/*`, `@custom-types/*`, `@server/*`, `@fixtures/*`, `@e2e/*`.

More detail on the architecture (templates and jobs, state, pagination, PDF, AI and so on) is in [CLAUDE.md](CLAUDE.md).

## Versions

The current version is shown at the bottom of the tool rail and in `GET /api/health`. What changed in each version is in [CHANGELOG.md](CHANGELOG.md).

## 6. Troubleshooting

- **PDF export fails:** run `pnpm exec playwright install chromium` and make sure the web app is running at `WEB_URL`.
- **"Server offline" banner:** the API is not running. Use `pnpm dev`, not only `pnpm dev:web`.
- **Saving is blocked:** the saved data could not be read. Look in `data/` for a `.corrupt-*` file or the `.bak`; do not delete them.
- **AI says "not configured":** check `.env`, then restart. For Ollama check that it is running (`ollama list`) and that the model was pulled.
- **AI request times out:** local models are slow on a CPU. Use a smaller model or a hosted provider.
- **Port in use:** change `PORT` for the server, or stop whatever uses 3001 or 5173.

## Credits

City suggestions in the location fields use data from [GeoNames](https://www.geonames.org/) (CC BY 4.0), see `scripts/build-cities.mjs`.
