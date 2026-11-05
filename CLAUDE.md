# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

CV Builder: a client-only React 19 + TypeScript + Vite app (MUI v7, Redux Toolkit) with a split view — an editor on the left and a live A4 preview on the right, printable to PDF via `react-to-print`. There is no backend yet. See `CV-BUILDER-PLAN` issues on GitHub (#28-#49) for the roadmap.

## Commands

Package manager is **pnpm**.

- `pnpm dev` — Vite dev server
- `pnpm build` — `tsc -b && vite build`
- `pnpm test` — Vitest (once); `pnpm test:watch`. Single file: `pnpm exec vitest run src/path/file.test.ts`. Tests live next to the code as `*.test.ts(x)`. Default environment is node; component tests start with `// @vitest-environment jsdom` and use Testing Library (see `pages/editor-page/editors.test.tsx`). jsdom is pinned to v26 because newer versions need a newer Node than some machines here have.
- `pnpm lint:check` — ESLint on `src`, no changes (what CI runs); `pnpm lint` does the same with `--fix`
- CI (`.github/workflows/ci.yml`) runs build, lint:check, format-check and test on every PR.
- `pnpm format-check` / `pnpm format-fix` — Prettier (`.prettierrc`: `trailingComma: es5`; keep that style)

## Architecture

**Path aliases are mandatory.** ESLint (`no-restricted-imports`) forbids relative imports (`./`, `../`). Use `@components/*`, `@custom-types/*`, `@custom-styles/*`, `@hooks/*`, `@pages/*`, `@store/*`, `@fixtures/*` (defined in `tsconfig.json`, resolved by `vite-tsconfig-paths`). The only exceptions are `main.tsx` (`./index.css`, `./App`), which carry eslint-disable comments. Also use `useAppDispatch`/`useAppSelector` from `@store/store-helper`, never raw `useDispatch`/`useSelector`.

**State (three Redux slices, `src/store/`):**

- `vault` — the CV facts: `profile`, `links[]` and dynamic `sections[]` (each with `type`, `title`, `items[]`; each item has `fields`, `bullets[]`, `tags`, `shouldShow`). Defined by the `runtypes` schemas in `custom-types/vault-types.ts`. All edits go through the reducers in `store/vault/vault-slice.ts`. Skills reuse the item model: a group is an item (`fields.category`) whose `bullets` are the skills (`text` = name, `rating`).
- `cvData` — only `metaData` and `style` of the current CV file.
- `app` — UI state: page structure (section ids per `fullWidth`/`left`/`right` column; the ids `personalInfo`/`contactInfo` are the header, anything else is a vault section id), column widths, selected editor page, and the `shouldApplyChanges` / `shouldDiscardChanges` / `shouldAddNewItem` flags. `useSyncStructure` (mounted in `App`) keeps the structure consistent with the sections via `reconcileStructure`.

**Files and migration.** The saved file is `CvFile` = `{metaData, vault, style}`. `migrateCvFile` (`store/vault/migrate-vault.ts`) reads every supported format: older legacy files (`{metaData, data, style}`) are converted, vault files go through a version chain (`VAULT_MIGRATIONS`, add a step and bump `CURRENT_VAULT_VERSION` when the format changes). Never read a CV file without it.

**Editor draft/apply pattern.** Editors edit a _local draft_ built with `useVaultDraft`: a `useReducer` over the same `vaultReducer`, so editors use the exact reducers the store uses. `useSectionDraft` adds the item operations for item-based sections. Apply/Discard/Add buttons live in the footer and communicate through the one-shot boolean flags in the `app` slice: the button sets the flag, the editor reacts in a `useEffect`, runs the callback and resets the flag. A change of the stored data (import, discard) resets the draft; visibility toggles are also written to the store at once and use `skipNextReset` so other unapplied edits survive. Editor pages are chosen by section `type` in `editor-page.tsx`; the preview does the same in `preview-page.tsx` (sections of other types are not rendered yet).

**Preview** (`pages/preview-page/`) reads the vault and lays parts out according to `app.structure`. Drag-and-drop of parts between columns is in `editor-page/section-placement/` using `@dnd-kit`. Typography/fonts/colors come from `custom-styles/` and `style`; shared text rendering goes through `components/cv-typography*`.

**Import/export** (`hooks/use-import-export-json.ts`): export downloads a `CvFile`; import goes through `parseCvFileText` (which migrates). In dev only (`import.meta.env.DEV`) the app starts with the fake `fixtures/sample-cv.json`; the dynamic import is stripped from production builds.

**Personal data:** the real CV goes in `data/` (git-ignored, as is `cv-export.json`); never commit it. `data.example/` shows the layout and `fixtures/` holds fake data for tests. Older real exports are handled by the migration.
