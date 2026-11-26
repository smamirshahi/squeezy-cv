# Changelog

All notable changes to Squeezy CV are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the version numbers
follow [Semantic Versioning](https://semver.org/) (while the major number is 0,
a minor bump may change the saved data format; the migration chain reads old files).

How to release: see "Versioning" in `CLAUDE.md`.

## [Unreleased]

## [0.21.5] - 2026-11-26

### Added

- About dialog (#457): Changelog and GitHub links next to the version.
- README (#457): a screenshot of the app (made with the fake sample data) and a note that masking before an online AI is best effort.

## [0.21.4] - 2026-11-26

### Added

- Project files for going public (#457): `LICENSE` (PolyForm Noncommercial 1.0.0: free to use, change and share for any non-commercial purpose; commercial use needs permission), `CONTRIBUTING.md` (issues welcome, pull requests not accepted for now) and `SECURITY.md` (private vulnerability reporting), and a Licence section in the README. The wording "free for non-commercial use" is now a project rule in `CLAUDE.md`.

## [0.21.3] - 2026-11-25

### Changed

- Tutorials brought up to date (#509): the Vault tutorial has a new step "Import all your old CVs (beta)" (why the app exists, several PDFs, the review, conflicts, Undo import), a skills move-icon line and the browser folder option in "Back it up" (#492, #511, #574, #577); the Templates tutorial covers the Grouped rows skills layout (#518, #520); the Job application tutorial has a new "Start from the advert" step and explains the automatic status, Save for later and Start another job (#543, #575). The Vault tutorial's pictures now match their steps.

## [0.21.2] - 2026-11-25

### Changed

- The "Using AI safely" tutorial now has eight steps: new steps on setting up your AI (provider cards, Test key, the Model field, a model for one task) and on what a request costs (estimate, real cost notice, Cost and usage, default models), and the Send to AI step covers the provider warning, Readable / Exact text, "Hide a word or phrase", "sent as written" and the message count (#509: #531, #537, #538, #545, #551).

## [0.21.1] - 2026-11-25

### Changed

- Importing several PDFs now opens the Send to AI window once for all the files (it shows every file's message) instead of once per file; one approval covers the run, and a cancel sends nothing more and keeps the files already analyzed (#580).

### Fixed

- Import (#580): two different roles at the same employer in overlapping years are no longer merged into one entry. Alike titles ("Software Developer", "Senior Software Developer") still merge, and a changed title is shown as a conflict to settle; the same goes for two different degrees at one school.

## [0.21.0] - 2026-11-25

### Added

- Import several PDFs (and pasted text) at once, in "Paste CV text, AI sorts it" (marked BETA, it will keep improving). The files are combined: the same entry in several files becomes one item with the different descriptions gathered (each line keeps its source), items already in the vault are updated and shown as before and after, and anything the files disagree on (dates, titles, employer, profile details) is shown for you to settle before it is saved. Nothing is saved until you press Add to my vault, and one Undo takes it back. Each file shows its own status (Waiting, Analyzing, Analyzed), a file that is still waiting can be removed, and when you cancel the Send to AI step the files already analyzed are kept and not sent again. The Send to AI window names the file it is about, and "Also looks private" has a Hide all button. The Vault marks what an import added or updated (#574).
- XING is now one of the link types in Main info, with its icon on the CV.

### Fixed

- The import dialog showed the old AI provider after you chose another in Change AI; it now updates when the settings dialog closes.

## [0.20.1] - 2026-11-25

### Changed

- Repo (#457): a `.gitleaksignore` lists the three false positives of the full-history secrets scan (a fake test key and an icon import), so the scan comes out clean.

## [0.20.0] - 2026-11-24

### Added

- Job application (#575): a "Start from the advert" box at the top of the form. Paste a job link or the text of the job page and the AI fills company, role, location, work mode, employment type, the advert text and the link. Filled fields carry an AI mark until you edit them, and there are Undo and "Use another job". A link is read by Gemini when a Gemini key is set (only the link is sent); when the page cannot be read (LinkedIn usually refuses) the box keeps the link and asks you to paste the page text. New routes `POST /api/ai/job-fields` and `POST /api/ai/job-link`, in server and browser mode.

## [0.19.4] - 2026-11-23

### Fixed

- AI settings (#571): after you change the provider and close the dialog, the provider shown in Advert analysis, Tailor, chat and the other AI panels updates at once; before, it kept the old one until the page was reloaded.

## [0.19.3] - 2026-11-22

### Changed

- Applications (#568): every action in the table's last column is now an icon button with a tooltip (Restore, Delete forever, Continue, Drop, Move to Deleted), the same on every kind of row; before, some were text buttons.

## [0.19.2] - 2026-11-21

### Changed

- Applications (#564): the first delete (the icon in a list row, and the Delete button of an application) now asks "Move to Deleted?" before moving it, like deleting for good does; the delete icon in the list rows is grey like the open-in-new-tab icon next to it.

## [0.19.1] - 2026-11-21

### Added

- AI price check (#562): once a month a GitHub Action reads the providers' price pages and, when a model's price is no longer shown there, opens one issue (label `ai-prices`) so the price list gets updated; nothing changes by itself. `pnpm exec tsx scripts/check-ai-prices.ts` runs the same check by hand.

## [0.19.0] - 2026-11-21

### Added

- AI cost (#551): the Send to AI window shows the model (with a Change list for this task), the cost in plain words ("About 1 US cent, up to 3 US cents if the answer is long"), a "Why a range?" box that splits what you send from the answer's length, what this month already cost with that provider, and the cost on the Send button ("Send to Anthropic · ~1¢"); after each request a notice says what it really cost (from the token counts the provider reports), and AI settings has a new "Cost and usage" page with this month's total, the price of each task's model and the latest requests (kept in this browser only, with a Clear button). Prices are known for Claude, Gemini and Groq models (Gemini's free tier is noted); Ollama shows "free", any other model "price unknown". The prices say the day they were last checked ("checked 21 Nov 2026"), and a test fails when that date is older than 90 days.

### Changed

- AI default models (#551): with a Claude key, "Pick what to hide" and "Place unsorted items" now use Haiku (`claude-haiku-5-5`) and every other task uses Sonnet (`claude-sonnet-5-5`) instead of Opus, which is much cheaper. `ANTHROPIC_MODEL`, the browser model field or a model chosen for one task in AI settings still wins. Claude also thinks less: low effort for sorting and picking, medium for writing and scoring (it was the model's own default, high for Sonnet, before).

## [0.18.0] - 2026-11-21

### Added

- Deleted section (#559): any row in Applications (draft, ready or sent) has a delete icon that moves it to a new **Deleted** filter in the left list instead of removing it. In Deleted, each row can be restored or deleted for good (with a confirmation); deleting again removes it from the app. In an application's detail view Delete sits at the top. Job and application files get an optional `deletedAt` (format version 2, old files open unchanged).

## [0.17.5] - 2026-11-21

### Changed

- Applications (#557): deleting an application is now easy to find. Each application row in the list has a delete icon (with a confirmation), and in an application's detail view the Delete button sits at the top next to the status instead of at the very bottom.

## [0.17.4] - 2026-11-21

### Changed

- Ask AI to pick what to hide (#555): each suggested item now has an eye icon instead of a checkbox (crossed eye and struck-through text = will be hidden, open eye = kept), the same way you show and hide items elsewhere; the button reads "Hide N items".

## [0.17.3] - 2026-11-21

### Changed

- Job Content tab: the Relevancy badges of entries and bullets now sit in their own column at the far right, so they line up (#553).

## [0.17.2] - 2026-11-21

### Fixed

- Send to AI window: the "Readable" view is now readable. It shows headings, plain lines and bullets ("Software Developer", "Company: [Company 1]", "Start date: Jan 2018") instead of the raw outline with `id: i1`, `fields:` and `bullets: (none)`. "Exact text" still shows what is really sent (#549).

## [0.17.1] - 2026-11-20

### Fixed

- Job application page: the "Saved for later" dropdown is gone; parked jobs are listed in Applications (Candidate). The "Saved for later" notification's "View list" button opens Applications on the Candidate filter (#547).

## [0.17.0] - 2026-11-20

### Changed

- Send to AI window: it shows the provider's warning (for example that a free tier may train on what it receives), the Send button is the purple AI button and says how many messages go out, the title carries the AI icon, and the footer says nothing leaves your computer until you press Send. An unticked automatic row now reads "sent as written" and the footer counts them. "Show exact text" is now a Readable / Exact text switch, and a new "Hide a word or phrase" field hides text without selecting it (keyboard and touch). The "remember my own masks" line says they are kept on this device (#545).

## [0.16.0] - 2026-11-20

### Changed

- Job application page: the right panel now starts with the Advert analysis card (the AI settings gear and the model that will run are in its header, with an "Optional" chip and a visible "Add the advert text first" hint), then the steps, and ends with Save and continue and "I applied elsewhere". The Status card, the progress bar and the note / apply-by fields are gone from this page; the status follows from what you do (Save and continue: Draft, Save for later: Candidate, I applied elsewhere: Applied) and is still changed in Applications. The steps list the required rows first and the optional ones after a divider, "Advert text" is marked required, and the visa sponsorship check sits in "The job" card (#543).
- "Start another job" is replaced by two header buttons: Save for later (works on every screen size and opens a blank form) and Clear. Clear only empties the form; the job is kept as a Draft (or stays in Saved for later) and the notification has a "Bring it back" button. The "Start another job?" question is gone (#543).

## [0.15.1] - 2026-11-20

### Fixed

- Browser mode, AI settings: the Model field now always shows the recommended model (as the placeholder and as the first option, before the key is tested), uses the app's dropdown instead of the browser's plain list, and says so when the provider's model list could not be loaded (#541).

## [0.15.0] - 2026-11-19

### Added

- AI settings: a task can use its own model, not only its own provider. Pick a task in the AI settings and fill "Model for this task" (empty uses the provider's model; the hint shows what that is). The model is saved with the choice, shown in the task list, and forgotten when the task switches provider. Works in server and browser mode; old settings files still load (#538).

## [0.14.0] - 2026-11-19

### Added

- Browser mode, AI settings: each provider is a card with a status chip (Not set up, Not tested, Key works, Test failed) and a Model field that is always editable. Empty uses the recommended model, shown as the hint; a model you type is used by every AI call. After a passing test the card suggests the models the key can use (best effort) (#537).

### Changed

- Test key now tests the model that will really be used, so a retired model shows up in the test (it no longer uses Claude Haiku), and shows the provider's own error (#537).
- The AI settings footer in browser mode says that keys and models are kept when you press Save (#537).

## [0.13.2] - 2026-11-19

### Fixed

- Gemini: the default model is now gemini-3.8-flash, because Google retired gemini-2.5-flash for new users (404) (#535).

## [0.13.1] - 2026-11-19

### Fixed

- Test key no longer fails for Groq (its JSON mode needs the word JSON in the messages) (#533).

## [0.13.0] - 2026-11-19

### Added

- Browser mode, "Use your own AI key": each provider (Claude, Gemini, Groq) has a link to its keys page, short numbered steps for creating a key, and a Test key button that sends one tiny request (no CV data) and says whether the key works (#531).

## [0.12.0] - 2026-11-19

### Changed

- Templates: names are unique (case ignored). A new template, a premade one or the New job dialog cannot take a name another template has; Duplicate names the copy "Developer (duplicate 1)", then 2, and so on (#529).

### Fixed

- Saving never deletes the saved templates when the app holds no real template (#529).

## [0.11.0] - 2026-11-19

### Added

- The premade Developer template starts with its own colours (text #222222, secondary #555555, accent #1f3a5f) (#527).
- Contact info: switches to show or hide the email, phone number and location for the whole template (on by default).
- Skills: move a skill category up or down in the vault with arrow buttons (stored in the vault order), with a note that the final order for a job is set later.
- Vault: empty Description fields (experience, education, projects) and the Professional Summary show a placeholder: write whatever comes to your mind, in full and in your own words; you can adjust it later and rephrase it for each job application (#525).

### Changed

- Default typography: Name is 20pt (was 18) and Section heading 12pt (was 13); saved templates keep their sizes (#527).

### Fixed

- Typography rows showed the unit twice ("20ptpt bold") (#527).
- Templates: the tooltip next to "Editing" counted the stand-in job as a job using the template (#527).
- Templates: a template added with "Add to my templates" (or made with New template) before any job exists is no longer gone after a reload (#525).

## [0.10.0] - 2026-11-18

### Added

- Skills: a new **Grouped rows** layout (#520): one row per group with the bold label on the left and the skills joined with dots, a thin line between rows. **Levels in grouped rows** is None (default), Exceptions (a level in small grey text only after skills that differ from the group's usual level; none when no level is clearly the usual one) or All; a languages group always shows every level. The Skill Icon setting is switched off in this layout. Stored as the optional `skillsLayout: "grouped"` and `groupedLevels` in the template's style, so old files open unchanged.
- Skills: a **move icon** next to delete on each skill moves it to another category (#518).
- Browser version: **import a CV from a PDF** (#511). The PDF is read on your device (its text layer, no upload), with the same limits and messages as the server version: 5 MB, 20 pages, no password, no scans (no OCR). The PDF reader is only downloaded the first time you use it.
- Browser version: **Send feedback** works without a server (#510). "Open on GitHub" opens a new issue with your note, the kind and the optional app info already filled in (you need a GitHub account); "Copy the text" is there for everyone else, and also for a note too long to fit in a link.
- Browser mode: **store my data in a folder** (#492). In "Your data", Choose folder keeps the CV, templates, jobs and applications as files in a folder you pick, the same layout as the server's `data/` folder. A folder that Drive, Dropbox, iCloud or OneDrive syncs gives you sync and a backup, and the app never talks to those services. Chrome and Edge on a computer only; AI keys are never written to the folder.
- A **"Using AI safely" tutorial** (#504) in the Tutorials list: AI as a helper, online or offline AI, what leaves your computer, masking, hiding more yourself, and relevancy. It opens by itself the first time you open the AI settings in any way (rail icon, gear next to an AI button, menu), and "How AI is used" in the AI settings and "How does this work?" in the Send to AI window open it again.
- Templates: **show or hide details** in Sections for Projects (technologies, link, description), Education (field of study, location, dissertation title, description or bullet points) and Experience (location, description or bullet points). All are on by default. Stored as the optional `hiddenDetails` in the template's style, so old files open unchanged.
- Skills: the Skill Icon setting has **Don't show the level** (names only).

### Changed

- Templates: the **Design tab now has the same layout as Sections** (groups Page, Colours and Typography on the left, the live preview in the middle, the settings of the chosen group on the right). Typography is an accordion, one style open at a time.
- Templates: the **Editing template** switcher sits next to the tabs on Design and Sections, and its hint is an (i) tooltip.
- Templates: the right panel in Sections can be resized.

## [0.9.0] - 2026-11-17

### Added

- Templates: **skills layout** (#502) in the Skills section's settings: a list (as before), two or three columns, or all skills of a group on one line. Stored as the optional `skillsLayout` in the template's style, so old files open unchanged.
- The "The saved data cannot be read" banner has **Remove unreadable items**: it deletes the saved templates and jobs that cannot be read (a `.deleted` copy is kept) and loads again, so saving works after you import a file. A template that cannot be read can now be deleted through the server and in browser mode.

### Changed

- The **Developer** premade template now holds only summary, skills, experience, projects and education (no publications, awards, certifications, interests or unsorted), and its description says so.
- Templates: **rename and New template happen in place** (#499), with no dialog. The pencil next to a name (or "Add a subtitle") turns the card into a name and subtitle form; **New template** opens a draft card at the top of the list, and creating it opens the new template's Sections tab. Enter saves, Esc cancels, and a name another template already has is flagged before you save. The card buttons are now Edit, Rename, Duplicate and Delete in that grouping, with Rename and Duplicate as grey outline buttons.
- The how-it-works pictures use fictional company names.

### Fixed

- The Sections tab preview showed only the first two pages, so the last sections could not be reached; it now shows the whole CV.

## [0.8.0] - 2026-11-17

### Changed

- The Vault sidebar has an **Assistants** group below New section (#493): Unsorted (with a highlighted count when it holds items) and "Paste CV text, AI sorts it" (AI-marked). Import JSON and Export JSON stay at the bottom.
- The app and repo are renamed to **Squeezy CV** (#467), with a new lemon icon (a lemon-slice C with a drop falling on the V): favicon, PWA icons (192, 512, maskable), Apple touch icon, and the mark in the top bar and About dialog. Browser-mode storage keys (IndexedDB, localStorage) now start with `squeezy-cv`, so data saved in the browser under the old name is not read any more (back up first). Hosting moved to the new Cloudflare Pages project `squeezy-cv` (`squeezy-cv.pages.dev`, #480); a project cannot be renamed, so the old address is retired and browser data saved there does not carry over.

### Added

- Templates have a **subtitle** (#495): the Create template form takes a name and a subtitle (by default the columns and the sections in order, e.g. "One column: Summary, Skills, Experience"), Rename edits both, and the list shows it under the name. The Developer premade no longer says "1-2 pages": the page limit is set per job.
- A **Premade templates** list below your templates (#488), starting with **Developer**: one column (header, summary, grouped skills, experience, projects or open source, then education and certifications; optional sections last). "Add to my templates" makes a real template from it, laid out with your own sections, which you can then edit, rename or delete like any other. The page limit belongs to the job, so set it there.
- The Welcome tutorial opens by itself the very first time the app is opened (#482); page tutorials follow on each page's first visit. People who already saw a tutorial are not welcomed again.

- Templates has a new **Sections** tab (#477, with #465 and #476): the list of the template's sections on the left, the sample CV in the middle with the chosen section outlined and tagged "Editing" (click a section on the paper to pick it; the Highlight switch turns the outline off), and its settings on the right, with Back and Next in CV order. Below a desktop the list is the dropdown in the settings header. The header options (photo, nationality, marital status, gender, right to work) are in Personal Info, Links in Contact Info, the References options in References, Skill icon in Skills and the page layout and section order on this tab; Design keeps what is the same everywhere (margin, date format, spacing, line under titles, icons next to details, bullet point icon, colours and type).
- Work Experience and Education each have their own **Order of entries** (newest first, the default, or oldest first) in the template; an order a job sets by hand still wins. Template format version 2 (a migration adds the new settings).
- Publications (#465, #476): your name is bold among the authors, the journal is in italics, the link is visible text at the end of the line (a bare DOI shows as `doi.org/...`) or not shown, long author lists are cut with "et al." (3, 6 or all; in APA your own name is kept), and the order is newest first or your own. "My name as written in citations" is saved in your vault (Main Info profile), not in the template. The publication settings have a live sample.

### Fixed

- Adding a skill category: filling in the Category no longer removes the empty skill input (#490).
- Publications: "Authors before et al." set to 3 now keeps 3 authors, not 6 (#490).
- An item with no text (for example an unfilled project) no longer draws its section heading; a section with only such items is left out (#490).
- The Bullet Point Icon dropdown shows the actual bullet next to each name (#490).

### Removed

- Demo mode (#429): the "Try with demo data" button on the first-run screen, the made-up CV with two demo templates and a job, the Demo banner (Reset demo, Leave demo), the "Demo - not saved" label and the places that switched off PDF export, Mark as applied and AI actions in the demo. A new user now starts with an empty vault and the built-in blank layout; ready-made templates will come later. Your own data is not touched.

### Changed

- Awards: the Date is a month picker like Start and End, shown with the template's date format; older text dates such as "Mar 2024" are converted when the file opens (a bare year stays as text). Skills no longer have a "Years" field (it was never shown on the CV); stored values are dropped. Vault format version 3 (#469).
- New Experience and Education entries start with "Current" unchecked; "Add new ..." focuses the first input; the pasted BibTeX stays in its box (#468).
- Workflows: a PR preview deploys only with the `preview` label, and a docs-only merge does not redeploy (#470).
- Tutorial: the install hint now also names "Add to Home Screen" for iPhone and iPad and says installing makes it less likely that the browser clears your data; the section example reads "Publications" or "Skills"; the Apply picture shows real eye icons; the AI wording step and note are corrected; the Applications tutorial has plain headings instead of the big coloured name (#462).
- The commit the app was built from (#460): the About dialog shows it next to the version (`Version 0.7.0 (1a2b3c4)`), and the version label in the tool rail and the More menu shows `Commit 1a2b3c4` as a tooltip. It is read from git at build time (`CF_PAGES_COMMIT_SHA` on Cloudflare Pages), "unknown" when there is none.
- One UI layer (#453): every MUI component and icon is imported from `@components/ui` (icons from `@components/ui/icons`); buttons, text, links, fields, dropdowns, dialogs, papers and chips are wrappers with a fixed set of variants, colours and sizes (written down in `docs/design-language.md`), icons are all the Outlined set, and ESLint warns about direct `@mui/*` imports.
- Applications page: the Save for later button is gone (use it on the job page); Export all has the same height as the Sort dropdown. About dialog: Close is the orange filled button. Job page: Choose PDF has an orange outline.
- About dialog (#368): my photo, my own "Why I made this" text, a short strip of the three ideas (write it once, pick for each job, keep a record), and two cards for "Your data" and AI that say what the app really does (data stays with you, AI is optional and marked, you see the exact text before it is sent, masking can hide names and employers, AI only proposes). The dialog has a fixed header and footer, fits phones and the dark theme.
- The "How to use" guide dialog is gone. What it said that no tutorial said (back up your data, install the app, your own AI key in browser mode, the Safari-on-iPhone warning) is now in the Vault tutorial, which has a new "Back it up" step. The "Privacy note" stays, in the footer of the About dialog.
- Opening the app at its address now shows the Vault (`/vault`) instead of jumping to `/jobs/default` (#455). The installed app (PWA) also starts on the Vault. Links such as `/jobs/<id>` are unchanged.

### Added

- References section (#464): a new section type, added with "Add a section". Each reference has a name, position, organisation, relationship and optional email and phone, and can be hidden for a single job like any entry. On the template's Style page, under References, two options: show contact details (off by default, they are other people's details) and "Only say References available on request" (replaces the list with one line, even when the section has no entries). References are never sent to AI: they are left out of chat and tailoring, are not scored, and the AI import does not create the section. No saved-format change, so no migration.
- "Delete all my data" in the browser version (#452, part of #350): in "Your data", under a Danger zone, a button that permanently removes everything Squeezy CV keeps in this browser: the database (CV, templates, jobs, applications with their PDFs and the earlier versions), settings, AI keys and choices, drafts, and the offline copy (service worker and caches). The dialog says what goes, offers "Download backup first", and enables the button only after you type DELETE. If another Squeezy CV tab holds the database it says to close the other tabs and nothing is removed. Afterwards the page reloads to an empty first start (without the unsaved-changes prompt). Cancel changes nothing. It is hidden in server mode (the data is the `data` folder there). Covered by unit, component and e2e tests.
- A privacy note, reachable from the About dialog ("Privacy note") (#451, part of #350). They say where the data is (this browser, or the `data` folder), to download backups, what AI sends, that masking is best effort and where the AI key lives; the texts follow the mode the app runs in. Decision recorded: the server mode stays supported for developers and self-hosting, the browser mode is for everyone else (`CLAUDE.md`, the reference skill and the README say how the two relate).
- The browser version is an installable app that works offline (#450, part of #350). `pnpm build:browser` adds a web manifest (name, `/jobs` as start page, standalone window, icons including a maskable one), a service worker that caches the whole app after the first visit, and `Cache-Control: no-cache` for the worker and manifest. A new version waits until the open tabs are closed, so open work is never interrupted, and is used on the next visit. "Your data" shows an Install button where the browser offers it, a short "Add to Home Screen" hint on iPhone and iPad, and says when the app is installed (installed apps are less likely to be cleared by the browser). The server version has no service worker. An e2e test checks the manifest and that the app opens offline on a deep link in Chromium; Lighthouse was not run.
- AI from the browser with your own key (#449, part of #350). In browser mode, Settings → "Set up the providers" has fields for your Claude, Gemini and Groq keys (and an advanced Ollama switch with the `OLLAMA_ORIGINS` command). The keys stay in this browser's storage, go only to the provider they belong to and are never in a backup; the page recommends a spending limit. Every AI feature (analyse, score, chat, reword, bullets, ATS wording, hide, place, paste-and-sort import) runs in the browser with the same code as the server, including the personal-detail masking and the "Send to AI" preview (which works without a key). Without a key the buttons say "AI is not set up. Open Settings and add your own key". The AI routes moved out of `server/app.ts` into `server/ai/ai-routes.ts`, shared by the server and the browser; `FileAiSettings` moved to `ai-settings-file.ts`. Reading a PDF to import is still server-only.
- PDF without the server (#448, part of #350). In browser mode the Export dialog previews the print page (`/print/<job>`) and its button opens the browser's own "Save as PDF" with the file name suggested; the page is A4 with the template's margins and a real text layer. Marking a job as applied freezes the CV as data (as before) but stores no PDF: the sent CV is drawn again, exactly as sent, by the new page `/print-application/<id>` (the application page shows it and has a "Save as PDF" button; an application with an uploaded PDF opens that file). The server mode still makes the PDF with Chromium. An e2e test (`browser-mode.e2e.ts`) checks A4 size, page count and text layer in Chromium; Safari and Firefox were not compared yet.
- "Your data" dialog (Data in the tool rail, Your data in the phone's More menu) with **Download backup** and **Restore from backup** (#447, part of #350). A backup is one JSON file with the CV, templates, jobs, saved jobs and applications including the PDFs that were sent; it has the `meta` block and never holds AI keys. Restoring runs the migration chains, refuses a file from a newer app or one that is not a backup before writing anything, replaces records with the same id, and names records it had to skip. Works in browser mode and with the server (`GET`/`POST /api/backup/file`), so you can move your own `data/` into the browser. The dialog warns that clearing site data deletes everything in browser mode.
- Hosting the browser version on Cloudflare Pages (#446, part of #350): `.github/workflows/deploy.yml` builds `pnpm build:browser` and deploys `main` to production and ready pull requests to a preview, `public/_redirects` makes deep links like `/jobs` work, and the site asks search engines not to index it. `docs/hosting.md` has the one-time setup, the address (`squeezy-cv.pages.dev`, which must not change because browser data belongs to the address) and how to restrict it to chosen people with Cloudflare Access.
- Browser mode (#445, part of #350): the app can keep all its data in the browser (IndexedDB) instead of the `data/` folder, with no server. Start it with `pnpm dev:browser` or build it with `pnpm build:browser` (`VITE_STORAGE_MODE=browser`). It has the same schema checks and migration chains as the server, keeps the previous version of every record (`.bak`) and a copy of what you delete, and asks the browser for persistent storage. AI, PDF export and PDF import still need the server and say so until they are ported. The server mode is unchanged.
- Every saved file kind (job, template, application, candidate, as well as the CV file and vault) has its own migration chain, registered in `shared/migration/migration-chains.ts`. An older file is upgraded when it is imported or read from `data/` (the old file is kept as `.bak`), a notice says "This file was made with Squeezy CV x and has been updated to y", and a file from a newer app is refused with a clear message (#430).
- The Profile picture dialog shows the person placeholder while there is no image, and its button says "Add image" (it says "Change image" once there is one) (#440).
- The Unsorted section is back in the Vault sidebar (and the phone chips) (#306). Its "Ask AI where these belong" panel is a purple AI card that names the AI in use and has a "Change AI" button; it works with any provider. The answer is repaired when a small model returns it slightly wrong (a bare list, numbers, other key names).
- "Paste CV text, AI sorts it" is back on the first-run screen and in the Vault tree (#297). It works with any AI you have set up (Claude, Ollama, Gemini, Groq), not only Ollama. The dialog has a purple AI card that names the AI in use, says whether the text stays on this computer, and has a "Change AI" button that opens the settings for this task.
- A "Send feedback" button on the top bar, right of the Tutorials icon (#390). Pick Feedback, Bug or Feature (Feedback also has a happy, no feeling or sad face), write one note and press Send. The note becomes a GitHub issue labelled `customer-created` and its kind when `FEEDBACK_GITHUB_TOKEN` is set in `.env`; otherwise a prefilled GitHub page opens. Bug and Feature notes need at least 10 characters. An optional "Include app info" box (on for bugs) adds the version, browser and page name (the box says so); nothing else is sent. After sending, the dialog shows the issue number and a link; if sending fails the text stays, with Try again, Open on GitHub and Copy. On a phone the dialog is full screen.

### Changed

- Notifications: one shared toast replaces the old snackbars. It uses the theme's panel colour, shows an icon for its kind (success, info, warning, error, undo), has a close button, readable actions (View, View list) and a line for the time left. It closes after 6 s, pauses on hover or focus, errors stay until closed, Esc closes the newest, at most 3 are shown. It sits at the bottom centre of the page area (above the tab bar on a phone), never over the rail or the side panels (#433).

## [0.7.0] - 2026-11-13

### Changed

- The Job application page (#432) follows design v2: the form is five short steps (The job, Where and how, Pay, Your view, The advert) and the right side holds the job's status (Draft or Ready to apply, shown only; it is set on the CV page), Save and continue, Save for later (with an optional Apply by day and note), "I applied elsewhere", a "Ready to continue" list, the advert analysis (AI) and quick checks. Save for later and "I applied elsewhere" clear the form for the next job. Starting another job asks first when the current one is not in Saved for later. The Job name follows the role and company until you type your own.
- The Templates page (#417) shows one PDF button per job: the PDF that was sent when the job has an application, otherwise one made from the saved job. It used to show two identical icons.
- The ATS score (#415) has its own page: an "ATS score" button under Chat in the Apply menu opens it, and the sidebar keeps only the score ring and its status. "Update score" is only on when the CV changed since the last scan (the score is calculated on this computer, so the same CV always gives the same number) and sits beside the purple "Suggest wording" button. "A guide, not a target" is always shown on top, the advert's keywords are chips with a Missing / On your CV switch, and each category opens to list its issues.
- The Tutorials dialog (#413) fits every screen size: a contents sidebar with ticks on desktop and small laptops, tabs on a tablet, and on a phone a full page with a Tutorial dropdown that opens a bottom list. A tutorial is ticked once you reach its last step, and a "Don't show on start" switch stops tutorials opening by themselves on a first visit.
- CI (#399) saves GitHub Actions minutes: it runs only on pull requests that are not drafts (not on branch pushes and not again after the merge), cancels the older run when a new commit arrives, skips docs-only changes, caches the Playwright browser and stops after 15 minutes. It can be started by hand from the Actions tab.

### Added

- "I applied elsewhere" (#432): records a job sent outside the app: how (LinkedIn, Glassdoor, Indeed, company website, email, recruiter, job board or your own), the day, and whether you sent a CV (upload its PDF). Applications now can have no frozen CV (`submitted` is optional) and have `appliedVia`; old files open as before. The Applications page shows the uploaded PDF or "No CV attached", and the ZIP export includes uploaded PDFs.
- Applications (#432): a Dropped view lists jobs taken off Saved for later, with Restore and Delete; Drop and Restore show a message at the bottom left. "See all in Candidates" opens the Candidates view.
- The requirements table of the advert analysis keeps its lines, and scrolls with its headings in view when the list is long (#432).
- The job panel on the right of the Job application page can be resized like the other panels (#432).
- Applications tutorial (#343): a fifth tutorial, "Your applications" (4 steps: the list and its sidebar, the statuses, Applied and the frozen copy, follow up and the No reply flag), in the Tutorials list. It opens by itself the first time you visit the Applications page, and after that from the ? in the top bar.
- Visa sponsorship check (#269): a "Check visa sponsorship" button under Company on the job details page opens a short explanation of what a UK sponsor licence means (and does not mean), the company name with a copy button, and links to the official GOV.UK register of licensed sponsors and SponsorLicenceCheck.co.uk, so you can check the company yourself. Optional; nothing is stored or sent and no AI is used.
- ATS score (#258): a new section in the Apply sidebar, under a divider (below a desktop it is an "ATS score" tab with the score beside it, and a panel next to or under the CV). Two separate scores that run on this computer with no AI: **Your CV** (Formatting, Searchability, Content quality: columns, photo, page count, skill symbols, contact details, section names, dates, numbers and weak openings) and **Match to this job** (Hard skills from the analysed advert with the words on and not on the CV, Soft skills, Title & experience). A ring with the natural range 75-90 marked, category bars with "n issues", a "Fix next" list that links to the place to change it, and "Analyse again" which keeps the first scan and shows the change per category (+n) and what got fixed. The scans are kept in this browser per job, never in the vault or the job. Every score has an (i) hint and a "How is the ATS score worked out?" dialog; the wording says it is a guide, not a target, and that real ATS differ. The Export dialog shows the score and the top fixes. "Suggest natural wording" (AI, purple, through the Send to AI dialog) asks a model to work the advert's missing or differently worded keywords into your own summary and descriptions, only where they already say it; a suggestion that adds something your text does not say is flagged and starts unticked, and the ticked ones become this job's wording (one undo step), never the vault.
- Candidates (#215): park a job you found (company, role, link, advert text, note, optional apply-by day) with "Save for later", from the job details page or the Applications page. Candidates are rows in the Applications table (filter "Candidates" under Before sending), with the apply-by day and overdue ones in red. "Continue" makes a job from the candidate, "Drop" takes it off the list, "Delete" removes it. A candidate saved from an existing job opens that job on "Continue" instead of making a second one. Stored as files in `data/candidates/`.

- The app adapts to the window size (#348): four classes (phone under 600 px, tablet 600-899, small laptop 900-1199, desktop 1200 and up; desktop is unchanged). On a phone the tool rail becomes a bottom tab bar and About, Settings and the theme move into a More menu in the top bar; the Apply menu becomes a tab strip above the page; the CV panel, chat and previews dock under the canvas (a collapsed Preview row on the Templates pages); the Vault tree becomes chips and items open on their own screen; tables become cards; the Applications detail is a slide-over; dialogs are full screen; the canvas zoom fits the width on first view (lowest zoom 40%). The paper and the PDF never depend on the window size. `src/e2e/responsive.e2e.ts` checks six sizes (1920 to 390) for sideways page scroll, unreachable controls and the paper size.
- Tests for the export metadata and migration registry, the Export all ZIP and route, the demo data and the template jobs table (#391, #392, #353, #280).
- Demo mode (#353): "Try with demo data" on the first-run screen shows a made-up CV with two templates and a job, kept in memory only. A Demo banner has "Reset demo" and "Leave demo"; nothing is saved or written to the data folder, and PDF export, Mark as applied and AI actions are off.
- Applications page (#392): an "Export all" button above the table downloads one ZIP with every application (`application.json` and the PDF that was sent), `summary.csv` and `index.json`; search and filters do not change it, and a damaged application is listed in `index.json` instead of hiding the others.
- Every JSON file the app exports or saves records the app version, the format version, the time and its kind under `meta` (#391). Opening a file made by a newer app is refused with a clear message; migrations run through a shared registry.
- Templates page (#280): the jobs of a template are a table (job linked to `/jobs/<id>` in a new tab, company · role, created, application status, PDF of the sent application or of the saved job, sortable) with an empty state.

### Fixed

- The "Save for later" dialog (#425) is wider and shorter: Company and Role, and Link and Apply by, sit side by side, it never grows past the visible window, and the first label is no longer clipped at the top.
- Dialogs that scroll, like "Save for later" (#421), show a scrollbar that stays visible. On a Mac the system hides its scrollbar until you scroll, so a long form looked cut off with no sign that there was more.
- The SponsorLicenseCheck link on the job details page (#419) opens its site: the address was spelled "licence" and did not resolve; it is `sponsorlicensecheck.co.uk`.
- Opening a job by its address (for example `/jobs/<id>`) could end on the first job instead: the saved data was loaded twice at the same time (React's development mode starts the first load twice) and the second load put the first job back. A load that is running is no longer started again.
- "All applications" on an application's page shows the list with the same search and filter again, and the Applications page says "1 job" for a single job.
- Test suites brought up to date with the Apply layout, the new Applications page and the first-visit tutorials (unit, component and Playwright end-to-end); the tests of the removed Tailor page were deleted with it.
- The Playwright end-to-end tests (all 50 pass) run in CI again (#315, #360).

## [0.6.0] - 2026-11-11

### Changed

- Applications page redesigned (#384): one list of unsent jobs and sent applications with a Sort dropdown, a merged "Role · Template" column (the template is now always shown, also for older applications and unsent jobs), status as a dropdown of pills with a coloured dot, "CV sent · View" under the date, and an open-job icon in the last column that opens the job in a new tab. The sidebar is grouped (All jobs, Before sending, Sent, Needs a nudge). The side panel has a close button, a Next step card, Progress, and a Job data table with the extra job fields (URL, location, work mode, employment, salary, feeling, chance); for a sent application "Draft created" starts its Timeline.

### Added

- Apply tutorial (6 steps: the advert, template and sections, page limit, choosing entries, wording, export and mark as applied) in the Tutorials dialog; the (i) next to "Job application" in the top bar opens it. Each tutorial (Vault, Template, Apply) opens by itself the first time you visit its page.

## [0.5.0] - 2026-11-11

### Changed

- Chat panel redesigned (#380): a provider chip with what is sent, a gear that opens the AI settings for chat, a "…" menu with Clear conversation, "Try" chips and Chat can / can't in the empty state, and each proposal as one AI card (tick the changes, flagged rewordings start unticked, Dismiss or Apply). The checkbox is aligned with its text and the message box takes several lines.

## [0.4.0] - 2026-11-11

### Fixed

- Export PDF checks no longer warn "Photo included" when the photo is switched off in the style (so it is not in the PDF).

### Added

- Links in Main info (vault) and the job advert link in Job application have an "open in a new tab" icon (left of the delete icon) instead of the "Open" text button.
- Apply, General step: "Ask AI to pick what to hide" shows its answer in the AI card (each item with its lines and reason, ticked; untick to keep one, then "Hide ticked", one undo step). The answer is kept when you change step. Cancelling the Send to AI window is no longer shown as an error.

### Changed

- Export PDF dialog: the preview is wider and as tall as the checks, opens fitted to the width and without the browser's PDF toolbar; the File name label is no longer cut off.
- Apply, Template & content: the right panel keeps its steps but says "Section n of m", and its header has the job's Draft / Ready status and an **Export PDF** button (the export dialog can also mark the job as applied).
- Apply, General step: removed the "Allow n pages" and "Auto-fit now" buttons (the page limit choice and the switch do the same); the auto-fit switch explains what it does and says when the CV is over the limit; removed "Applies to this job only".
- About dialog: the rail's coffee button is now "About". It shows who made Squeezy CV and why, how data and AI are handled, a "Support this project" box with the coffee link, and the app version (the texts and photo are tracked in #368).
- AI settings are a dialog now, opened by the rail's Settings button and by "Settings…" next to an AI action (it opens on that task). Left: All tasks, each task and "Set up the providers"; middle: what it does and what is sent and masked; right: the provider choice, saved at once. The Settings page is gone (the old /settings address opens the dialog).
- Apply, Experience step: the AI strip of a description works in two steps. "1 · Lean on": pick points from the advert (the table opens in a dialog, the picks show as removable chips with Clear and stay until cleared). "2 · Then": Shorten, Rephrase, Make longer and Make bullets (one filled button, after a divider) all use the picked points; Shorten keeps them instead of putting them first. The separate bullets card is gone from this page (the inspector keeps it), and "Replace the description with these bullets" now sits above the proposed bullets.
- One table for what the job asks for (Must have, Nice to have, Keywords, one row per point). It is read-only in the "Advert added" dialog and in a new "See results" dialog under Analyse job description (which no longer lists the keywords inline), and clickable in the Emphasise dialog.
- Apply, Experience step: "Emphasise…" opens a dialog with the advert's Must have, Nice to have and Keywords in three columns. Click the points to lean on, then Emphasise: AI words the bullets (or the description text, which has the same button in its AI strip) so those points come first, only where they already say it. It replaces the single-requirement dropdown. "Replace the description with these bullets" (on by default) sits next to Make bullets.
- Apply, Experience step: the AI actions now say which job they work for. A purple "AI works for this job" card names the job, whether an advert is attached and the provider; an (i) button explains what the AI considers and what is never sent. The description sits in a bordered box with an attached AI strip (Shorten, Rephrase, Make longer) and a neutral "Use the vault text" button, and "Make bullets" has its own purple card.
- Apply, Template & content: the right panel is now a step-by-step wizard with a step bar and Back/Next buttons that name the next step. Its first step, "General", has the page limit (1 page, 2 pages or a number from 3, with a tooltip, a status chip, small page drawings and where the overflow starts), an auto-fit switch, "Choose items to hide" (nothing is hidden until you press Hide selected) and one purple AI card with Score sections, "Ask AI to pick what to hide" and a choice of AI for each action (#357).
- Job titles are a table in "Header and links": pick the title this job shows, with the AI's relevance and reason for each, best first. "Score job titles" and "Score all sections" score them (#358).

- A photo on the CV (#345, #255): add it in Vault > Main Info, then move it in a fixed 4:5 frame and zoom in a dialog (the original is kept, so it can be adjusted again). It shows top right in the header, with the name and contact details together on the left, and in the PDF. The export window warns that a photo is included. It is never sent to AI.
- A Projects section with its own fields (#347): Title, Role, Type (Personal, Open source, Academic ...), Technologies, Start, End, Link and Description. "Projects" is now a choice in the New section dialog. Technologies is a chip input in the vault (Enter or comma ends an entry) and shows as one "Technologies:" line on the CV, with the type next to the role and the link on its own line. AI import knows these fields. Existing projects keep their data (the role is the old Subtitle).
- A "Coffee" button above Settings in the left rail that opens the Ko-fi page (#345).
- A third tutorial, "Your templates" (layout, arranging sections, style, and where items are chosen), in the Tutorials list.
- A "Send to AI" window before any text goes to an online model: it shows the exact masked text as a readable outline, lets you switch automatic masks off, hide any selected word as Company, School, Person, Location, Date or Other, and mark a job advert as private; the model's answer gets the real words back. Local models skip it, and "Score all sections" asks once and lists every section (#332).

### Changed

- The Ko-fi button in the tool rail is labelled "Support me" instead of "Coffee".

- The page limit now belongs to the job, not the template, and a new job starts at 1 page (#356). The overflow warning above the page names the limit, links to the General step and is split over three lines. The page-limit buttons are gone from the inspector and the Jobs page.
- "Score entries" and "Score all sections" say "again" and turn outlined once there are scores; the result line is bold green text with a check (#358).

- Everything that uses AI is now marked with a sparkle icon and the AI purple: the Score, Analyse, reword, rewrite, make-bullets, place and import buttons, Chat's Send button and the Chat entry in the Apply sidebar (#355). "Use the vault text" is always shown, disabled when the text is already the vault's, outlined and on the right.

- Send to AI: links, emails and phone numbers found in the text are now hidden automatically as [Link n], [Email n] and [Phone n] (you can still switch one off in the window), instead of being only suggested; year ranges like "2018 - 2021" are no longer mistaken for phone numbers. Schools, universities and colleges are now [Institution n] (#354).

- New vault sections are no longer added to templates by themselves (#351): a section a template does not place is not drawn. Use "Add section to template" on the Layout page to place it.
- Main Info is now four cards (Identity, Contact, Links, Optional details), other job titles are chips, and the right panel shows a live preview of the header with a note that it is only a preview of the vault. The Apply / Discard bar is a fixed row at the bottom of the page and no longer covers the content (#345).
- Tailoring is now per section: the Tailor page is gone. "Analyse job description" on the job application page keeps the keywords on the job, and each section's Tailor button scores its entries (for skills each category and each skill) against them (#320).
- Apply: each entry can show or hide its parts (title, dissertation, description ...), Start and End are one "Dates" part, and hiding the dates no longer shows "Present". The summary and descriptions get Shorten, Rephrase for this job and Make longer (#323).
- Apply: "Score all sections" scores every section in one go with a progress bar (#324).
- Apply: entries are a table (Entry, Organisation, Dates) where a section has those; the Wording column only shows when used (#325).
- Vault: lists are tables with sortable headers instead of up/down arrows (#326).
- Style: "Icons next to details" option (on by default); the template bar says how many jobs were already applied with it (#327).
- The per-section "Tailor" button is now "Score entries" and "Tailor all sections" is "Score all sections", because they only score entries and change nothing (#328).
- The outline lists only the sections the template places and the job includes, and sections can no longer be reordered there (#318).
- "Score entries" is a filled button like "Score all sections"; Back and Next are outlined (#336).
- AI buttons (Shorten, Rephrase for this job, Make longer, Make bullets, Emphasise and the per-bullet buttons) show a spinner until the result is there (#335).
- The relevance badge reads "Relevancy 85%" and a tooltip explains what the number means and its bands (#334).
- A list with a single item no longer shows sort buttons in its column headers; outdated unit tests (routes, Main Info, vault lists) were brought in line with the current screens (#359).

### Fixed

- Apply: the content panel scrolls to the end of a long entry instead of cutting it off (#336).
- Groq: the default model is now `openai/gpt-oss-120b` (the Llama model before gave a 404 on a normal key); a failed "Analyse job description" says that the analysis shown is from an earlier run (#333).

## [0.3.0] - 2026-11-10

### Added

- Skills: skill names and group categories autocomplete from default lists (technical, general, spoken languages, AI-assisted development); suggestions already used are greyed out. Language groups use their own levels (Basic to Native). Skills in a group stay sorted by level, highest first. Only one empty skill or empty item at a time.
- New section types **Awards** (title, issuer, date, short description, link) and **Personal interests** (a line of interests, optional detail), both default sections of a new CV; Publications is in the "Add a section" list.
- Publications and awards are kept newest year first, with the year on the right of each row and a "Sort by" control (year or title, with a direction arrow); item titles in the list are no longer cut at 60 characters.

### Changed

- The title of an item in the vault list and editor heading updates as you type, before Apply; the (i) icon of a one-line field is centred.
- The Unsorted section is shown as a disabled "AI sorting" entry (coming soon) while it is empty (#306).

- Location fields (Main Info, work experience and education) suggest "City, Country" while you type, from a built-in list of about 65,000 cities (GeoNames, CC BY 4.0, downloaded the first time you use a location field). You can still type anything. Rebuild the list with `scripts/build-cities.mjs`.
- Work experience and education items: the "Remote" checkbox is now an optional "Work mode" (On-site, Hybrid, Remote) next to Location (city, country). Items saved with the old Remote tick show as Remote.
- Tutorials: the ? next to "Squeezy CV" now opens a dialog with a list of tutorials on the left (How Squeezy CV works, Your vault). The Vault tutorial (4 steps: add what you have done, describe it in your own words, it stays on your computer, you choose what reaches a CV) opens by itself the first time the Vault is opened, and after that only from the ?.
- Main Info: "Right to work (optional)" still takes free text, and now also offers ready-made UK wordings (British/Irish citizen, settled, pre-settled, Skilled Worker, Global Talent, Graduate, Student, Family/partner, other visa, needs sponsorship) in a dropdown, with an (i) icon explaining it.
- The Jobs tool is now **Apply** (#298): a left sidebar with Job application (name, company, role, location, work mode, employment, salary range or fixed, expected salary, how I feel, my chance, link, advert text or PDF, Mark as ready), Template & content (template picker on top, the CV page and a step-by-step panel for the header, links and each section's entries) and the assistants Tailor and Chat. Tailor and Chat are no longer rail items; the first edit creates the job, there is no dialog.
- **Applications** opens inside the same app (no page reload) with a status list on the left (All, Draft, Ready to apply, Applied, Interview, Offer, Accepted, Rejected, Withdrawn, No reply), one table of unsent jobs and sent applications, and the details of a row on the right.
- Template page: sections are removed with a bin and brought back with Add section; the Vault button is "New section". Entries use an eye, Highlight is a star button, links can be hidden per job, and every link type shows its own icon on the CV.
- Top bar: Tailor, Export PDF and Mark as applied buttons removed for now; "How it works" is a ? next to the name; undo and redo no longer move when the save state changes.
- The sample CV is no longer shown when nothing is saved; AI import no longer adds empty items or a second summary item.
- Jobs and Chat show "No job added yet" (with an Add a job button) until you add a job; Templates shows the page with no cards until you create a template. The stand-in default job and template are no longer saved or shown.
- "Paste CV text, AI sorts it" is disabled with a "Coming soon" tooltip; the import also repairs near-valid answers from small local models.

### Added

- Top bar: the job and template dropdowns, New job and the fit chip are gone; the centre now shows Vault → Template → Job application as links, each with an (i). A new "How it works" button opens a three-step explanation of the three (#295).
- Publications is now a default section. Each item has title, authors, journal, year and link; paste a BibTeX entry to fill them, and choose the publication style (APA-like, IEEE-like, plain) in Style settings (#256).

### Changed

- Templates: "Page layout" and "Style settings" are now one **Design** tab (layout and section order first, then page options, colours and text styles) with one live preview; the addresses are `/templates/design` and `/templates/<id>/design` (the old two no longer exist).
- Style settings: the colours are now three fields in a Colours card (text, secondary, and an optional accent for section titles, the line under them and bullet and skill symbols) instead of a colour per style, and the style table has 5 styles with size and weight (Name, Section heading, Item title, Body, Small); the headline, bullets and icons follow Body. Older files keep their look: text and secondary come from their old body and small colours.
- Style settings: the right panel always shows your own CV (the demo text is gone); the Skill icon list has a Text choice, now first and the default for new CVs, that shows the level as a word such as "Advanced"; skills are one per line, and the icon style (size and colour) now changes the rating icons; its default is smaller (10pt).
- Vault: a **+ Add section** button under the sections list; the type list is Summary, Experience, Education, Skills and "Other section" (for certifications, awards, projects...), each with a short description; deleting a section returns to the main vault page and no longer says "0 item(s)"; "Add skill" is on the right; more space under the SECTIONS title (#281).
- Templates page: the "Use for <job>" button and the notes about the job you are editing are gone; each card has its buttons beside the title and an expandable "N jobs prepared with this template" list; the new-template name field is wider; sort by date, popularity or name with a reverse arrow; templates now remember the day they were made (#281).
- Vault tree footer: "Paste CV text" is full width, Import JSON and Export JSON share one line with equal widths, and each gets its own line when the sidebar is too narrow (#278).
- Import dialog: "Sort it" is now **Analyze with AI**; the PDF area is a full-width drop zone with a plus icon (click, keyboard or drop); the dialog shows the next step, and the disabled Analyze and Add buttons say why in a tooltip (#276).
- Resizable side panels no longer have a fixed maximum width and can be collapsed to zero; chosen widths remain saved per side (#273).
- "AI setup" is now **Settings** (`/settings`): a list on the left, an "All tasks" card and one card per AI task in the middle (with a description of what each does and sends), the provider radio buttons on the right, and the set-up steps on the page. Employer and school names are always masked; the checkbox is gone (#271).

### Changed

- Vault item editor: Start and End date inputs are equal-width across the full row, with Current at the far right; experience and education forms have larger inputs and more spacing, Remote location controls, an optional dissertation title, and a Field of study input for education. Section-title spacing is increased, skills no longer show the vault facts banner or the extra category-field border, skill levels are always tracked without a plus control, and item removal stays in the middle list (#267).
- Vault item editor: Apply and Discard buttons for each experience, education and other item; every input is on its own line, with start, end and Current together (#265).

### Fixed

- Work Experience and Education item titles now close their parenthesis: "Role (Mar/2022 - Present)" (#250).

### Changed

- Skill level in the vault is 1 to 5 with names (Learning, Working, Proficient, Advanced, Expert). The "No level" choice is gone: leave a skill without a level, and let the template decide whether levels are shown (#263).
- Skills in the vault: the level is now a small dropdown (No level, 1-10, 10 = highest) instead of five stars, so the skill name has room; an (i) explains Level and Years, and the delete icon matches the others (#261).
- Vault section pages (Work Experience, Education, Skills, Projects and the other sections): the middle area is now just the list of item titles with their dates; click one and its inputs open in the right panel. The grey expanding rows are gone. A new item is selected at once (#251). The vault tree on the left now lists only the sections; the right panel shows the full item editor (saves as you type) and the Apply/Discard step is gone for item lists. The section title field is full width and its trash icon lines up with the rows below (#254).

### Added

- Main Info: optional marital status and gender (dropdowns with "Not stated"). Both are off by default; Style settings has a switch for each to show them under your name on the CV (#257). They stay in the vault and are never sent to AI.
- Every Description field has an (i) icon: write freely whatever comes to your mind; AI can later make bullet points from it or reword it for a specific job.
- Jobs: AI makes bullets from an item's description for the job. Select an item on the page, then "Make bullets" (and, once there are bullets, "Shorten"; with a tailored job also "Rephrase for this job" and "Emphasise" a requirement). You review the proposal first; a bullet with a number or name that is not in your description is flagged and starts unticked. The accepted bullets are saved in the job (the vault is not changed, "Use the vault's bullets instead" undoes it), so the PDF and a sent application keep them (#243).
- Work Experience and Education: a free-text Description on each item in the vault. Write what you did in your own words; it shows on the CV page and in the PDF, one block per line. It is the source for AI-made bullets in a later step (#242).

## [0.2.0] - 2026-11-08

The variant is split into a template and a job (#165-#172).

### Added

- Work Experience and Education: an optional Link on each item; when set, the organisation on the CV (and in the PDF) is a hyperlink. Only http(s) links are used (#235).

### Changed

- Experience, education and other sections no longer have bullet points in the vault. Write what you did in the Description; bullets are made per job with "Make bullets" (#243). **Saved data (vault version 2):** when an older file is opened, each item's existing bullets become the lines of its Description, and the item keeps no bullets (skills are unchanged). Short/Long/Formal wordings of those bullets are not kept. A CV then shows those lines as plain text until you make bullets for the job. Nothing is written until you Save; the server keeps the previous file as `.bak`. AI import puts imported points into the description the same way (#244).

- Work Experience and Education are ordered automatically, newest first: by end date (no end date = current), then by start date. The reorder arrows are gone from their editors; each job can still order items itself (#237).

### Fixed

- Vault item editor: "Move to section" is gone, except for items in Unsorted, which need it to be placed (#238).

- Vault: the "You are editing a vault fact" banner is gone from the item editor and the section pages (#231).

- Vault: the "Where this item appears" panel with per-job eyes is gone; the right panel stays, empty. What a job shows is decided in the job (#229).

- Work Experience and Education: no eye button (what is shown is decided per job), and "Add new experience/education" sits below the list. Apply and Discard stay fixed at the bottom of the middle area on every page that has them (#227).

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

[Unreleased]: https://github.com/smamirshahi/squeezy-cv/compare/v0.21.5...HEAD
[0.21.5]: https://github.com/smamirshahi/squeezy-cv/compare/v0.21.4...v0.21.5
[0.21.4]: https://github.com/smamirshahi/squeezy-cv/compare/v0.21.3...v0.21.4
[0.21.3]: https://github.com/smamirshahi/squeezy-cv/compare/v0.21.2...v0.21.3
[0.21.2]: https://github.com/smamirshahi/squeezy-cv/compare/v0.21.1...v0.21.2
[0.21.1]: https://github.com/smamirshahi/squeezy-cv/compare/v0.21.0...v0.21.1
[0.21.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.20.1...v0.21.0
[0.20.1]: https://github.com/smamirshahi/squeezy-cv/compare/v0.20.0...v0.20.1
[0.20.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.19.4...v0.20.0
[0.19.4]: https://github.com/smamirshahi/squeezy-cv/compare/v0.19.3...v0.19.4
[0.19.3]: https://github.com/smamirshahi/squeezy-cv/compare/v0.19.2...v0.19.3
[0.19.2]: https://github.com/smamirshahi/squeezy-cv/compare/v0.19.1...v0.19.2
[0.19.1]: https://github.com/smamirshahi/squeezy-cv/compare/v0.19.0...v0.19.1
[0.19.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.18.0...v0.19.0
[0.18.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.17.5...v0.18.0
[0.17.5]: https://github.com/smamirshahi/squeezy-cv/compare/v0.17.4...v0.17.5
[0.17.4]: https://github.com/smamirshahi/squeezy-cv/compare/v0.17.3...v0.17.4
[0.17.3]: https://github.com/smamirshahi/squeezy-cv/compare/v0.17.2...v0.17.3
[0.17.2]: https://github.com/smamirshahi/squeezy-cv/compare/v0.17.1...v0.17.2
[0.17.1]: https://github.com/smamirshahi/squeezy-cv/compare/v0.17.0...v0.17.1
[0.17.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.15.1...v0.16.0
[0.15.1]: https://github.com/smamirshahi/squeezy-cv/compare/v0.15.0...v0.15.1
[0.15.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.13.2...v0.14.0
[0.13.2]: https://github.com/smamirshahi/squeezy-cv/compare/v0.13.1...v0.13.2
[0.13.1]: https://github.com/smamirshahi/squeezy-cv/compare/v0.13.0...v0.13.1
[0.13.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/smamirshahi/squeezy-cv/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/smamirshahi/squeezy-cv/releases/tag/v0.1.0
