# Changelog

All notable changes to CV Builder are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the version numbers
follow [Semantic Versioning](https://semver.org/) (while the major number is 0,
a minor bump may change the saved data format; the migration chain reads old files).

How to release: see "Versioning" in `CLAUDE.md`.

## [Unreleased]

### Added

- Templates and jobs (#165, in progress): pure model for splitting a variant into a template (look) and a job (what is shown), with `resolveVariant` and `splitVariant` (#166). Not used by the app yet.
- Server storage and API for templates and jobs (#167): `templates/<id>.json` and `jobs/<id>.json` (validated, atomic, `.bak`, versioned git commits), `GET/PUT/DELETE /api/templates` and `/api/jobs` (409 `in_use` for a template that a job uses), `GET /api/jobs/:id/resolved`, `POST /api/pdf {jobId}`. Old `variants/*.json` are read as one template + one job each when no jobs exist yet. `/api/variants` is unchanged.
- Web store with templates and jobs (#168): the editor now holds `templates[]`, `jobs[]` and `activeJobId`; the active variant is `resolveVariant(template, job)` (memoised `activeVariantSelector`). Hiding, order, tone and the auto-fit result are saved in the job; layout, style, page limit, auto-fit policy and skill style in the job's template, so jobs on one template share a look. Saving writes only the changed templates and jobs (`/api/templates`, `/api/jobs`); the print page and PDF use the job (`GET /api/jobs/:id/resolved`, `POST /api/pdf {jobId}`); applications can be made from a job. The UI looks the same: every job still has a template of its own until the templates page (#169).
- Templates and jobs in the UI (#169): the top bar chooses a **job** and shows its **template** next to it with a dropdown to change it, plus a "New job" dialog (name, template; new jobs share the chosen template, "New template…" makes a separate one). A new rail tool "Templates" lists templates with their jobs and counts: create, duplicate, rename, delete (disabled while a job uses it, with the reason). With an item selected the inspector edits the job; with nothing selected, and on the Style Settings and Page Structure pages, it edits the template and says so ("Changes template 'Template 1', used by 3 jobs"). "Variant" is now "Job" or "Template" in the interface.
- Tailoring creates a job (#170): "Create job from the accepted changes" makes a new job that shares a template chosen in the Tailor page (default: the active job's template). The job gets the selection, relevance, tone and the tailor record; its name defaults to the job title found in the advert and can be edited. A section-order proposal (when accepted) and a page limit that differs from the template go on a new copy "<template> (tailored)" that the job uses, so the source template is never changed. Alternative wordings still go to the vault bullets.

### Changed

- The job made by tailoring is named after the job title (no more " (AI)" suffix) (#170).
- New and duplicated jobs share the template of their source instead of getting a copy of it, so a change of the look reaches all of them (#169). Deleting a job keeps its template (delete templates on the Templates page). The rail item "Variants" is now "Jobs"; the first template is called "Template 1".

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
