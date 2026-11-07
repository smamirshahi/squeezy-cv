# Changelog

All notable changes to CV Builder are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the version numbers
follow [Semantic Versioning](https://semver.org/) (while the major number is 0,
a minor bump may change the saved data format; the migration chain reads old files).

How to release: see "Versioning" in `CLAUDE.md`.

## [Unreleased]

Version 0.2.0 (not released yet; the user tests first). The variant is split into a
template and a job (#165-#172).

### Added

- **Sections page is only titles**: the vault's Sections page now just renames or deletes
  sections. Ordering stays in Jobs > Sections & layout, where a new "Add section" button
  (type and title) was added. Every section's editor page has a "Section title" field.
- **Jobs page redesign** (new design, "Variants" board): a closable explainer (vault, job,
  CV), one job bar (job, name, New/Duplicate/Delete, template, page limit as 1/2 page buttons,
  auto-fit, and a status chip that says whether the CV fits), and two tabs. **Content**: one
  table of sections and entries with a "Show section" switch per section, a tick, expand
  for bullets, a wording menu and a Highlight button, drag handles and up/down buttons.
  **Sections & layout**: two layout cards (Single column (UK) recommended, Two columns) and
  the sections to tick, drag, place (Full width / Left / Right) and move with arrows. A job
  can now leave a whole section out (`hiddenSections` in the job file; optional, old files
  are unchanged). The separate "Page Structure" page is gone: it is this tab now.
- **Templates**: a template is how a CV looks: page layout and section order, fonts,
  colours, margins, date format, page limit, skill display and the auto-fit policy. Many
  jobs can share one template, so changing the look once changes it for all of them. A
  new rail tool "Templates" lists every template with the jobs that use it: create,
  duplicate, rename, delete (not while a job uses it, with the reason shown).
- **Jobs**: a job is one target (a company and role). It uses one template and decides
  what to show: hidden items and bullets, order, emphasis, wording per bullet, tone, the
  tailoring record and the result of the last auto-fit. It exists before any PDF does.
  The top bar switches jobs, shows and changes the job's template, and has "New job"
  (name and template; a new job shares the chosen template, or "New template…" makes a
  copy of the current look).
- The inspector says what an edit changes: with nothing selected and on the Style
  Settings and Page Structure pages it edits the template ("Changes template 'X', used
  by 3 jobs"); with an item selected it edits only the job.
- **Tailoring creates a job**: "Create job from the accepted changes" makes a new job on a
  template you choose (default: the active job's), named after the job title in the
  advert. An accepted section order or a different page limit goes on a copy
  "<template> (tailored)"; the source template and the vault wording are never changed.
- **Applications remember their job and template** (ids and names at the time). The
  applications list has Job and Template columns and searches them; the application page
  shows "Job: X · Template: Y". "Create new job from this" makes a job with the sent
  selection on the template it was sent with.
- Server: `templates/<id>.json` and `jobs/<id>.json` (validated, atomic, `.bak`, committed
  to the data repo), `GET/PUT/DELETE /api/templates` and `/api/jobs` (409 `in_use` for a
  template a job uses), `GET /api/jobs/:id/resolved`, `POST /api/pdf {jobId}`.

### Changed

- "Variant" is now "Job" (what to show) or "Template" (the look) everywhere in the
  interface; the rail item "Variants" is "Jobs". Internally, `Variant` is only the
  resolved view (`resolveVariant(template, job)`) that the preview, pagination, PDF and
  application snapshot use.
- Deleting a job keeps its template. Duplicated and tailored jobs share their source's
  template instead of getting a copy.
- The job made by tailoring is named after the job title (no more " (AI)" suffix).
- Saving writes only the changed templates and jobs. The print page and the PDF use the
  job.

### Removed

- **The variant lock.** Nothing is locked after "Mark as applied": an application keeps
  its own frozen copy and PDF, so editing or deleting the template or job later changes
  nothing that was sent. `?unlock=true`, the 409 `locked` answer, the lock banner and
  dialogs are gone.
- **The `/api/variants` routes**, `POST /api/pdf {variantId}` and the unused
  `insertVariant` action.

### Reading old data

- Old `variants/*.json` files are still read: while there are no template or job files,
  each variant appears as one template (`template-<id>`) and one job (`<id>`), and both are
  written to `templates/` and `jobs/` the first time you save. `variants/` is never
  changed or deleted. Application files from before jobs still load (the variant they
  were sent from counts as the job). Saved CV files in older formats are migrated as before.

## [0.1.0] - 2026-11-07

The baseline: everything built before the move to templates and jobs. Issue numbers
refer to GitHub issues.

### Added

- **Vault and editor** (#31-#35, #96, #140, #145, #159): one vault of facts with dynamic
  sections, generic items, bullets with Short/Long/Formal wordings, tags, ordered links,
  skills with levels and years, private notes and an opinion per item, inline item editor,
  resizable side panels. Saved files carry a version and are migrated on load.
- **Variants** (#37, #38, #94): a variant decides layout, section order, which items and
  bullets show, emphasis, wording, tone, page limit and style; the pure
  `render(vault, variant)` draws it. The vault is never changed by hiding.
- **Template, preview and pagination** (#39-#42, #88-#90, #93, #95, #146, #149):
  single-column UK default and a two-column layout, a live A4 preview with page markers,
  1 or 2 page limit, fit numbers, auto-fit and fill, hide-to-fit, drag and drop and
  keyboard reordering, outline, zoom, block toolbar and shortcuts, skill display options.
- **PDF export** (#43, #44, #91, #138): a real PDF from headless Chromium, an export dialog
  with checks, optional "mark as applied" afterwards.
- **Local server and data** (#36, #73): Fastify API, atomic JSON files with backups,
  optional private git repo for the data folder.
- **Applications** (#74, #75, #87, #98, #137): a frozen copy of the CV as sent plus status
  timeline, an applications list with search and filters, a variant lock while a CV is
  "Applied".
- **AI** (#45-#48, #76, #81, #85, #99, #101, #102, #133): tailoring to a job advert with
  guardrails and a diff review, import from pasted text, hide-to-fit suggestions, a chat
  panel with typed edits, providers Claude, Ollama (local), Gemini and Groq chosen per task,
  personal data replaced by placeholders before anything is sent, and a preview of the exact
  request.
- **Undo and redo** (#49) for all vault and variant edits.
- **Style settings** (#157): typography table with live preview.
- **Workspace design B** (#92-#100, #116): top bar, tool rail, light and dark theme,
  first-run and offline states.
- **Versioning** (#162): this changelog, the version in `package.json`,
  `GET /api/health` and the tool rail.

### Changed

- All packages updated (#154); Node 24 is the supported runtime.

### Known gaps

- Chat: streaming replies (#136) and compound requests (#135) are open.
- Gemini and Groq have not been tried against the real services (#134).

[Unreleased]: https://github.com/smamirshahi/CV-Builder/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/smamirshahi/CV-Builder/releases/tag/v0.1.0
