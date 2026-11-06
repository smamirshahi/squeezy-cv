# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

CV Builder: a React 19 + TypeScript + Vite app (MUI v7, Redux Toolkit) with a split view — an editor on the left and a live A4 preview on the right, printable to PDF via `react-to-print` — plus a small local Fastify server that stores the data as JSON files. See the GitHub issues #28-#49 for the roadmap (phases 0-1 done).

## Layout

One package, three folders in `src/`:

- `src/web` — the React app (components, hooks, pages, Redux store, styles). Entry: `src/web/main.tsx`.
- `src/server` — the local API (Node, Fastify). Entry: `src/server/main.ts`.
- `src/shared` — code both sides import: the `runtypes` schemas (`shared/custom-types`) and the pure vault logic (`shared/vault`: migration, file format, helpers). Keep it free of React, Redux and Node APIs.

## Commands

Package manager is **pnpm**.

- `pnpm dev` — web (Vite, :5173) and server (:3001) together; Vite proxies `/api` to the server. `pnpm dev:web` / `pnpm dev:server` run one of them; `pnpm server` runs the server once, without watching. `PORT` and `DATA_DIR` (default `./data`) configure the server.
- `pnpm build` — `tsc -b && vite build`
- `pnpm test` — Vitest (once); `pnpm test:watch`. Single file: `pnpm exec vitest run src/path/file.test.ts`. Tests live next to the code as `*.test.ts(x)`. Default environment is node; component tests start with `// @vitest-environment jsdom` and use Testing Library (see `pages/editor-page/editors.test.tsx`). jsdom is pinned to v26 because newer versions need a newer Node than some machines here have.
- `pnpm lint:check` — ESLint on `src`, no changes (what CI runs); `pnpm lint` does the same with `--fix`
- CI (`.github/workflows/ci.yml`) runs build, lint:check, format-check and test on every PR.
- `pnpm format-check` / `pnpm format-fix` — Prettier (`.prettierrc`: `trailingComma: es5`; keep that style)

## Architecture

**Path aliases are mandatory.** ESLint (`no-restricted-imports`) forbids relative imports (`./`, `../`). Use `@components/*`, `@custom-styles/*`, `@hooks/*`, `@pages/*`, `@store/*` (all under `src/web`), `@shared/*`, `@custom-types/*` (`src/shared/custom-types`), `@server/*`, `@fixtures/*` (defined in `tsconfig.json`, resolved by `vite-tsconfig-paths`). The only exceptions are `src/web/main.tsx` (`./index.css`, `./App`), which carry eslint-disable comments. Also use `useAppDispatch`/`useAppSelector` from `@store/store-helper`, never raw `useDispatch`/`useSelector`.

**State (three Redux slices, `src/store/`):**

- `vault` — the CV facts: `profile`, `links[]` and dynamic `sections[]` (each with `type`, `title`, `items[]`; each item has `fields`, `bullets[]`, `tags`, `shouldShow`). Defined by the `runtypes` schemas in `custom-types/vault-types.ts`. All edits go through the reducers in `store/vault/vault-slice.ts`. Skills reuse the item model: a group is an item (`fields.category`) whose `bullets` are the skills (`text` = name, `rating`).
- `cvData` — only `metaData` and `style` of the current CV file.
- `app` — UI state: page structure (section ids per `fullWidth`/`left`/`right` column; the ids `personalInfo`/`contactInfo` are the header, anything else is a vault section id), column widths, selected editor page, and the `shouldApplyChanges` / `shouldDiscardChanges` / `shouldAddNewItem` flags. `useSyncStructure` (mounted in `App`) keeps the structure consistent with the sections via `reconcileStructure`.

**Variants (CV-37).** `VariantSchema` (`custom-types/variant-types.ts`) holds tone, page limit, column layout, per-item `selection` (hidden items, order, emphasis, per-bullet visibility and wording) and `style`; hiding never touches the vault. `render(vault, variant)` (`shared/variant/render.ts`) is the pure function that resolves them into the document to draw. `store/variants` holds the list and the active one. Item visibility belongs to the active variant (the eye toggles in the editors and the Variants page write `selection`); the preview draws `resolveVault(vault, activeVariant)`, and `Item.shouldShow` in the vault is no longer used. The active variant's `layout` and `style` mirror `app.structure` and `cvData.style`: `activateVariant` loads them into the editor on switching, `useSyncActiveVariant` writes edits back. Emphasis is in the model but not drawn yet.

**Saving (CV-38).** `store/persistence/` holds the typed `api-client` (responses checked with the shared schemas), the pure `persistence-logic` (what changed since the last save), the slice, and `loadFromServer`/`saveToServer`. Nothing is saved automatically: the Save button writes what changed (vault, changed variants, deletions); `SavedState` is the text last known to be on disk. If the saved data cannot be read (`error`) or the server is down (`offline`), saving is blocked so the default empty CV never overwrites a file. In dev, the sample CV is shown (unsaved) when nothing is saved yet. `usePersistence` (mounted in `App`) loads at start and warns before closing with unsaved changes.

**Files and migration.** The saved file is `CvFile` = `{metaData, vault, style}`. `migrateCvFile` (`store/vault/migrate-vault.ts`) reads every supported format: older legacy files (`{metaData, data, style}`) are converted, vault files go through a version chain (`VAULT_MIGRATIONS`, add a step and bump `CURRENT_VAULT_VERSION` when the format changes). Never read a CV file without it.

**Editor draft/apply pattern.** Editors edit a _local draft_ built with `useVaultDraft`: a `useReducer` over the same `vaultReducer`, so editors use the exact reducers the store uses. `useSectionDraft` adds the item operations for item-based sections. Apply/Discard/Add buttons live in the footer and communicate through the one-shot boolean flags in the `app` slice: the button sets the flag, the editor reacts in a `useEffect`, runs the callback and resets the flag. A change of the stored data (import, discard) resets the draft; visibility toggles are also written to the store at once and use `skipNextReset` so other unapplied edits survive. Editor pages are chosen by section `type` in `editor-page.tsx`; the preview does the same in `preview-page.tsx`. Types without a special layout (projects, certifications, publications, volunteering, custom) use the generic editor/preview (`title`, `subtitle`, `location`, dates, `description`, bullets). The Sections page (`editor-sections.tsx`) adds, renames, reorders and deletes sections and applies at once (no draft). Tags and alternative wordings are edited in `item-metadata/item-extras.tsx`, a collapsed panel that only mounts when opened (keeps the editor fast).

**Preview** (`pages/preview-page/`) reads the vault and lays parts out according to `app.structure`. Drag-and-drop of parts between columns is in `editor-page/section-placement/` using `@dnd-kit`. Typography/fonts/colors come from `custom-styles/` and `style`; shared text rendering goes through `components/cv-typography*`.

**Import/export** (`hooks/use-import-export-json.ts`): export downloads a `CvFile`; import goes through `parseCvFileText` (which migrates). In dev only (`import.meta.env.DEV`) the app starts with the fake `fixtures/sample-cv.json`; the dynamic import is stripped from production builds.

**Server** (`src/server/`): `buildServer({storage})` in `app.ts` builds the API (`/api/health`, `/api/vault`, `/api/variants[/:id]`); `main.ts` only wires config and starts it on `127.0.0.1`. All data access goes through the `CvStorage` interface (`storage/cv-storage.ts`); `FileCvStorage` keeps `vault.json` and `variants/<id>.json` in `DATA_DIR`. Rules it enforces: every read and write is validated with the shared schemas (reads of old files go through `migrateCvFile`); writes are atomic (temp file + rename) and serialised per file; the previous readable version is kept as `.bak`, an unreadable file is moved to `.corrupt-<time>` and never replaces the backup; a corrupt file is reported (HTTP 500 `corrupt`) and never treated as empty; variant ids are whitelisted (`[A-Za-z0-9_-]{1,64}`) because they become file names; requests with a non-local `Host` or `Origin` are refused with 403. Variants are validated with `VariantSchema`.

**Personal data:** the real CV goes in `data/` (git-ignored, as is `cv-export.json`); never commit it. `data.example/` shows the layout and `fixtures/` holds fake data for tests. Older real exports are handled by the migration.
