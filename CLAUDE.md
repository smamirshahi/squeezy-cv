# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Never commit directly to `main`.** Always create a branch first, then merge it (see the `work-on-issue` skill). Every branch is named `<type>/<issue>-<description>` and needs a GitHub issue. `.githooks/pre-commit` refuses commits on `main` and on branches without an issue number; enable it once with `git config core.hooksPath .githooks`.

CV Builder: a React 19 + TypeScript + Vite app (MUI, Redux Toolkit) with a workspace — rail, live A4 preview and inspector — exportable to PDF, plus a small local Fastify server that stores the data as JSON files. The data model (version 0.2): **vault** (all facts) + **templates** (how a CV looks) + **jobs** (one target each: uses a template, decides what to show) + **applications** (frozen copy of what was sent). GitHub issues hold the roadmap and history (#28-#49 first phases, #165-#172 templates and jobs).

**AI is always marked (house rule).** Everything that uses AI is shown with the sparkle icon and the AI colour (purple = the theme's `secondary`, tokens `ai`/`ais`/`ait`/`aib`/`aix`), so the user can see at a glance when a model is involved. Use `AiButton` / `AiIcon` from `@components/ai-button` for every button that sends text to a model (score, analyse, reword, rewrite, make bullets, ask where items belong, pick what to hide, chat Send, AI import) and the AI card style (`WORKSPACE_COLORS.aiSoft`, border `aib`) for panels that group AI actions; rail/sidebar entries that are AI (Chat) carry the icon too. When you add or change a feature that calls an `/api/ai/*` route, apply this in the same change. Buttons that only apply or undo an AI result (Use these bullets, Apply selected) stay in the normal colours.

## Two ways to run (#350)

**Server mode** (default, `pnpm dev`): local Fastify server, data in `data/`, PDF by Chromium, keys in `.env`. For developers and self-hosting; it stays supported (decision, #451). **Browser mode** (`VITE_STORAGE_MODE=browser`, `pnpm dev:browser` / `pnpm build:browser`): a static installable app, data in IndexedDB, PDF by the browser's print, the user's own AI key in localStorage; this is what friends and testers use (Cloudflare Pages, `docs/hosting.md`). Both run the same React code: a change to a server route needs the same change in `web/store/persistence/browser/local-api.ts`; AI routes live once in `server/ai/ai-routes.ts`. See `data-model.md` ("Browser mode"). Hosting (Cloudflare Pages project `mohammad-cv-builder`, the Cloudflare Access email list, what deploys when, secrets, local development) is in `docs/hosting.md`: merging to `main` deploys the browser build automatically (not for docs-only changes), a pull request gets a protected preview only when it has the `preview` label (#470, saves Actions minutes), and `pnpm dev` is unchanged.

## Responsive layout (#348)

Four size classes that follow MUI's breakpoints: phone < 600 (`xs`), tablet 600-899 (`sm`), small laptop 900-1199 (`md`), desktop >= 1200 (`lg`, the original layout; keep its `sx` values and DOM unchanged). Prefer `sx` breakpoint objects; use `useViewport()` (`@hooks/use-viewport`, "desktop" in jsdom because `matchMedia` is missing, so unit tests see the full layout) only for what CSS cannot do, and never render a control twice. `ResizableAside` has `stackBelow` / `stackedHeight` (full width and no handle below the breakpoint; width capped at 45vw). Phone: bottom tab bar (`tool-rail.tsx`, the rail's DOM is last in a `column-reverse` row in `workspace.tsx`), `MoreMenu` in the top bar, full-screen dialogs. The paper, pagination and the print view never depend on the window size (`responsive.e2e.ts` checks it); zoom is screen-only (`ZOOM_MIN` 0.4, fit width once on first view below desktop).

## Layout

One package, three folders in `src/`:

- `src/web` — the React app (components, hooks, pages, Redux store, styles). Entry: `src/web/main.tsx`.
- `src/server` — the local API (Node, Fastify). Entry: `src/server/main.ts`.
- `src/shared` — code both sides import: the `runtypes` schemas (`shared/custom-types`) and the pure vault logic (`shared/vault`: migration, file format, helpers). Keep it free of React, Redux and Node APIs.

## Commands

Package manager is **pnpm**. Use Node 24 (`nvm use 24`).

- `pnpm dev` runs web (Vite, :5173) and server (:3001); `PORT`, `DATA_DIR` (default `./data`), `WEB_URL` configure the server. PDF export needs `pnpm exec playwright install chromium` once.
- `pnpm build`, `pnpm lint:check`, `pnpm format-check` (fix: `pnpm format-fix`), `pnpm knip` (dead code; remove what it reports).
- `pnpm test` (Vitest; single file: `pnpm exec vitest run <path>`), `pnpm test:e2e` (real browser, `src/e2e`). Component tests start with `// @vitest-environment jsdom`. Tests are currently paused, see the `testing-rules` skill.
- CI (`.github/workflows/ci.yml`) runs only on non-draft PRs. Open a draft PR to hold it back.
- Held-back packages (#154): `eslint`/`@eslint/js` v9, `eslint-plugin-unicorn` v65, `typescript` 6.0, `@types/node` follows Node 24. MUI is v9 (system props in `sx`, icons `*Outlined`), Vite 8.

## Versioning

SemVer, history in `CHANGELOG.md` (Keep a Changelog). The version lives in three places that must be equal: `package.json`, `src/shared/version.ts` (`APP_VERSION`, shown in `GET /api/health` and the tool rail) and the newest released heading in `CHANGELOG.md`; `version.test.ts` fails otherwise. Every user-visible change adds a line under `## [Unreleased]` in the same PR. **Release:** rename Unreleased to `## [x.y.z] - date` (add a fresh empty Unreleased and update the compare links), bump the three places, merge, then `git tag vx.y.z && git push origin vx.y.z` and `gh release create vx.y.z --notes-file` with that section. While the major number is 0 a minor bump may change the saved data format (the migration chain still reads old files).

## Saved formats and migrations (#391)

Every JSON file the app writes (CV export, `vault.json`, jobs, templates, applications) carries `meta: {appVersion, formatVersion, exportedAt, kind}` (`shared/migration/export-meta.ts`, `withExportMeta`; not the same as `CvFile.metaData`). A file without `meta` is the oldest format and still opens; a file whose `appVersion` is newer than `APP_VERSION` is refused with a clear message (`assertNotNewer`, called by `migrateCvFile`). Job, template, application and candidate chains are registered in `shared/migration/migration-chains.ts` (`upgradeFile`, run on import and on every server read; the old file is kept as `.bak`, the user gets a notice). Steps are run by `runMigrations` (`shared/migration/migration-registry.ts`: ordered `{kind, fromVersion, toVersion, migrate}`); the vault chain `VAULT_MIGRATIONS` is fed through it. **When a change alters a saved format, add a migration step, bump the matching `CURRENT_*_VERSION` and keep a fixture of the old file.**

## Architecture (short version)

Detail lives in the `cv-builder-reference` skill (`.claude/skills/cv-builder-reference/references/`): read the file for the area you touch.

- **Path aliases are mandatory.** ESLint forbids relative imports. Use `@components/*`, `@custom-styles/*`, `@hooks/*`, `@pages/*`, `@store/*` (under `src/web`), `@shared/*`, `@custom-types/*`, `@server/*`, `@fixtures/*`, `@e2e/*`. Use `useAppDispatch`/`useAppSelector` from `@store/store-helper`, never the raw hooks.
- **One UI layer (#453).** Never import `@mui/*` outside `src/web/components/ui/` and `custom-styles/theme.tsx` (ESLint warns). Components come from `@components/ui` (`Button`, `IconButton`, `Alert`, `Chip`, `Typography`, `Link`, `TextField`, `Select`, `Dialog`, `Paper`, `Checkbox`, `Radio`, `Switch`, `ToggleButtonGroup` and more are wrappers that allow only the app's variants/colours/sizes; the rest are re-exported in `ui/mui.ts`), icons from `@components/ui/icons` (the `*Outlined` set; add a new icon there). The allowed looks are listed in `docs/design-language.md`; read it before adding a UI element. To restyle or change a component, or to swap MUI, change it in that folder; the theme (`theme.tsx`) holds the shared look (colours, radius, defaults). When a component needs a fixed look, give it a wrapper file in `ui/` and remove it from `mui.ts`.
- **Data model (0.2):** vault (all facts) + templates (how a CV looks) + jobs (one target each: template, what to show, wording) + applications (frozen copy of what was sent). `resolveVariant(template, job)` gives the internal `Variant` that `render`, pagination, auto-fit and the PDF use. Hiding and wording belong to the job and never touch the vault. No lock: sent applications are frozen copies. See `data-model.md`.
- **State** (`src/web/store/`): `vault`, `cvData` (metaData + style), `app` (UI state, page structure), `jobs` (templates, jobs, active job), plus `persistence`, `history` (undo) and `chat`. All vault edits go through `store/vault/vault-slice.ts`.
- **Routing:** hand-written, the address is the source of truth (`shared/routing/routes.ts`, `hooks/navigation.ts`). Addresses: `/vault`, `/jobs`, `/templates`, `/chat`, `/settings`, `/applications`, `/print/<job>`. There is no `/tailor`: tailoring is per section (score each section, #320). See `routing.md`.
- **Editors** use a local draft (`useVaultDraft`) with Apply/Discard flags in the `app` slice. Editor pages are chosen by section `type`.
- **Server** (`src/server`): `buildServer({storage})`, all data access through `CvStorage`, validated with the shared schemas, atomic writes with `.bak`, local `Host`/`Origin` only. Optional git backup of `data/`.
- **AI:** `server/ai/` (Claude, Ollama, Gemini, Groq per task), prompts in `server/ai/prompts/*.md`. Text sent to an online model is scrubbed and previewed in the Send to AI dialog first. See `ai.md`.
- **Pure logic** that both sides use is in `src/shared`: keep it free of React, Redux and Node APIs.

**Personal data:** the real CV goes in `data/` (git-ignored, as is `cv-export.json`); never commit it. `data.example/` shows the layout and `fixtures/` holds fake data for tests.
