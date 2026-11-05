# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

CV Builder: a client-only React 19 + TypeScript + Vite app (MUI v7, Redux Toolkit) with a split view — an editor on the left and a live A4 preview on the right, printable to PDF via `react-to-print`. There is no backend yet. See `CV-BUILDER-PLAN` issues on GitHub (#28-#49) for the roadmap.

## Commands

Package manager is **pnpm**.

- `pnpm dev` — Vite dev server
- `pnpm build` — `tsc -b && vite build`
- `pnpm test` — Vitest (once); `pnpm test:watch`. Single file: `pnpm exec vitest run src/path/file.test.ts`. Tests live next to the code as `*.test.ts` (node environment, path aliases work).
- `pnpm lint:check` — ESLint on `src`, no changes (what CI runs); `pnpm lint` does the same with `--fix`
- CI (`.github/workflows/ci.yml`) runs build, lint:check, format-check and test on every PR.
- `pnpm format-check` / `pnpm format-fix` — Prettier (`.prettierrc`: `trailingComma: es5`; keep that style)

## Architecture

**Path aliases are mandatory.** ESLint (`no-restricted-imports`) forbids relative imports (`./`, `../`). Use `@components/*`, `@custom-types/*`, `@custom-styles/*`, `@hooks/*`, `@pages/*`, `@store/*`, `@fixtures/*` (defined in `tsconfig.json`, resolved by `vite-tsconfig-paths`). The only exceptions are `main.tsx` (`./index.css`, `./App`), which carry eslint-disable comments. Also use `useAppDispatch`/`useAppSelector` from `@store/store-helper`, never raw `useDispatch`/`useSelector`.

**State (two Redux slices, `src/store/`):**

- `cvData` — the CV itself. Its state type _is_ `CVJson` (`metaData`, `data`, `style`), so the store shape equals the import/export file format.
- `app` — UI state: page structure (which sections go in `fullWidth`/`left`/`right` columns), column widths, selected editor section, selected typography, and the `shouldApplyChanges` / `shouldDiscardChanges` / `shouldAddNewItem` flags.

**Schemas are the source of truth for types.** `src/custom-types/*` defines `runtypes` schemas (e.g. `CVJsonSchema` in `json-types.ts`) and derives TS types with `Static<>`. Imported JSON is validated with `CVJsonSchema.check`; changing a data shape means updating the schema, the slice's `initialState`, and the editor/preview for that section.

**Editor draft/apply pattern.** Section editors (`pages/editor-page/sections/editor-*`) edit a _local_ draft state (e.g. `newSkills`), not the store directly. Each has a `use-editor-*.ts` hook with the mutation helpers (update/remove/swap items, ids via `nanoid`). Apply/Discard/Add buttons live elsewhere (app bar/footer) and communicate through the one-shot boolean flags in the `app` slice: the button sets the flag, `useEditorPage`/section hooks react in a `useEffect`, run the callback, and reset the flag to `false`. Follow this pattern when adding a section. Some actions (e.g. skill visibility toggle) also dispatch to the store immediately.

**Preview** (`pages/preview-page/`) reads from the store and lays sections out according to `app.structure`. Drag-and-drop reordering of sections between columns is in `editor-page/section-placement/` using `@dnd-kit`. Typography/fonts/colors come from `custom-styles/` and the `style` part of the CV state; shared text rendering goes through `components/cv-typography*`.

**Import/export** (`hooks/use-import-export-json.ts`): export downloads `{metaData, data, style}` as JSON; import validates via the schema. In dev only (`import.meta.env.DEV`) the app starts with the fake `fixtures/sample-cv.json`; the dynamic import is stripped from production builds.

**Personal data:** the real CV goes in `data/` (git-ignored, as is `cv-export.json`); never commit it. `data.example/` shows the layout and `fixtures/` holds fake data for tests. Older real exports may not pass the current schema (bullet shape, `shouldShow`, `bulletPointIcon` changed); migrations are planned in the vault-schema issue.
