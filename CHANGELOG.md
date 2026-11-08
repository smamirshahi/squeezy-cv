# Changelog

All notable changes to CV Builder are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the version numbers
follow [Semantic Versioning](https://semver.org/) (while the major number is 0,
a minor bump may change the saved data format; the migration chain reads old files).

How to release: see "Versioning" in `CLAUDE.md`.

## [Unreleased]

Version 0.2.0 (not released yet; the user tests first). The variant is split into a
template and a job (#165-#172).

### Fixed

- Main Info: Full Name, Job Title and Right to work are one per line. The Job Title can have other options (with an (i) note on why); each job picks the one it shows (Jobs > Content > Job title). New optional Nationality (several, picked from an autofill list) shown under the name when turned on in Style settings (#225).

- Links: the sort buttons are gone from Main Info (the vault only holds facts). A job sets the order of its links (Jobs > Content > Links) and the template decides whether links show at all (Style settings, "Show my links") (#223).

- Main Info: "Add new link" is now inside the card below the links, the link type select is narrower and the URL wider; a link type another link already uses is disabled in the list, and the list is alphabetical (Other last) and opens at the top (#220).

- Main Info: the inputs now show example placeholders (#218).

- **Style settings preview follows the Page card**: the demo sheet now reacts to Margin, Date format and the right-to-work line (it already followed icons, section spacing and the title line).

### Changed

- **Tags removed from the interface**: tags had no function (nothing filtered or ranked by them, the AI reads the text itself). The tag boxes, chips and the (i) are gone and tags are no longer sent to AI; old files still load (the field is kept in the data). The vault item editor and the old editors keep the alternative wordings.
- **Delete a template that jobs use**: Delete is now allowed whenever it is not the last template. If jobs use it, the dialog lists them and asks which template to move them to (their auto-fit result is reset). Applications already sent keep their own frozen copy of the CV, so nothing sent changes.
- **Edit a chosen template (#212)**: Page layout and Style settings now edit the template named in the address (`/templates/<id>/layout`, `/templates/<id>/style`), not always the template of the job you are editing. Both pages start with an "Editing template" switcher and say whether the job being edited uses it; every template card has an **Edit** button; a new or duplicated template is selected. Reload and Back keep the template.
- **Grey page, white cards (#205)**: the middle area of Vault, Templates and Job settings is a grey page with white bordered cards, white inputs with a visible border and an amber "vault fact" warning.
- **Wider rail and resizable panels (#206)**: the left tool rail is wider, and the style preview, the Tailor panels and the application panel can be resized like the vault panels.
- **Tags (#207)**: an "Add tag" button and an (i) explaining tags replace the "+ tag" box.
- **Style settings (#208)**: the live preview is the right panel; "where this style is used" is an (i) tooltip per style; pointing at a style keeps only that style clear in the preview; names sit on the text baseline.
- **Section spacing and title line (#209)**: "Space between sections" and "Line under section titles" are in the Page card of Style settings and apply to the whole template. Per-section styles (#185) are gone.
- **Preview a template (#210)**: click a template card to highlight it and see it in the sample on the right.
- **Every section has its own address (#198)**: `/vault`, `/vault/<section>/<item>`, `/jobs/<job>` (`?view=settings`), `/templates` (`/templates/layout`, `/templates/style`), `/tailor`, `/chat/<job>`, `/ai`, `/applications` (search and filters stay in the address) and `/applications/<id>`. Reload keeps the place, Back and Forward move between sections, the rail and the lists are real links (middle click, new tab), an unknown job, section or item says "Not found" with a way back, and the page title follows the section. Leaving an editor with unapplied changes (link or Back) asks first. The old `/?applications`, `/?application=<id>` and `/?print=<id>` addresses redirect; the PDF print page is now `/print/<jobId>`.
- **Sidebar order and where settings live**: the rail is now Vault, Templates, Jobs. Vault holds only your data. Style settings and page layout moved to Templates (tabs "Templates", "Page layout", "Style settings"); Job data and the job's content moved to Jobs (view "Job settings", next to "CV page"). The "Sections & layout" tab of the Jobs page and the SETTINGS list in the Vault tree are gone.
- **Templates page layout**: "Templates", "Page layout" and "Style settings" are now a list on the left (like the vault sections), and the sample CV moved to a right panel whose width you can drag; the page inside it scales to fit.
- **Templates page background**: the middle area of the Templates page is white like the left and right panels.

### Fixed

- **Sidebars fill the window height (#199)**: the vault tree, the right panels (item panel, style usage, inspector, chat, template sample) and their resize handles now always reach from the top bar to the bottom of the window, also when empty; long content scrolls inside the panel.

### Added

- **Import from a PDF (#197)**: the "Paste CV text, AI sorts it" dialog has a "Choose PDF" button and a drop area. The local server reads the PDF's text layer (`POST /api/import/pdf`, max 5 MB and 20 pages, checked by content; the file is never stored) and the text appears in the editable box before you sort it. Scanned, password-protected, too big or too long PDFs get a plain message. The privacy notice now says the PDF text goes to the chosen provider.
- Links: choose the type (GitHub, LinkedIn, X, Instagram, ... about 30, or Other for a custom label) from a dropdown with its icon; a pasted address of a known site picks the type; existing links are matched by their label (#195).
- Jobs: "Score items" (Content tab). Paste the job advert (kept on the job) and the AI gives every entry of the saved CV a relevance score (0-100) and a one-line reason (`POST /api/ai/score`, uses the Tailor provider choice; only entry text and tags are sent, scrubbed like tailoring). The badge is coloured by band (related, maybe, unrelated) and shows the reason as a tooltip; only scores are stored, as one undo step, and nothing is hidden. "Hide to fit" uses the scores (#193).
- Jobs: each item shows its relevance score (or "Not scored"), and each bullet has Shorten, Extend and Rephrase buttons (`POST /api/ai/rewrite`). The proposal is checked for numbers and names that are not in the CV (flagged ones need a tick); "Use this wording" stores it as an alternative wording and selects it for the job in one undo step; the bullet's own text never changes (#186).

- **Templates: style per section (#185)**: removed again in #209 (see below).
- **Open the CV that was sent from the applications table (#187)**: every row has a View
  CV button (opens the sent PDF) and a download button; the side panel shows the PDF
  first, labelled "CV as sent on <date>", and says so when the stored PDF is missing.
- Vault: an Unsorted section (built in, created when first used, always last, cannot be deleted) for items you have not placed yet. Move an item to another section with "Move to section", or use "Ask AI where these belong" (new AI task "Place unsorted items"; sends item text and section names, scrubbed like other tasks) and accept each suggestion; nothing moves before that (#184).
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
