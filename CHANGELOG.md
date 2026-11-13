# Changelog

All notable changes to CV Builder are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the version numbers
follow [Semantic Versioning](https://semver.org/) (while the major number is 0,
a minor bump may change the saved data format; the migration chain reads old files).

How to release: see "Versioning" in `CLAUDE.md`.

## [Unreleased]

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
- About dialog: the rail's coffee button is now "About". It shows who made CV Builder and why, how data and AI are handled, a "Support this project" box with the coffee link, and the app version (the texts and photo are tracked in #368).
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
- Tutorials: the ? next to "CV Builder" now opens a dialog with a list of tutorials on the left (How CV Builder works, Your vault). The Vault tutorial (4 steps: add what you have done, describe it in your own words, it stays on your computer, you choose what reaches a CV) opens by itself the first time the Vault is opened, and after that only from the ?.
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

[Unreleased]: https://github.com/smamirshahi/CV-Builder/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/smamirshahi/CV-Builder/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/smamirshahi/CV-Builder/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/smamirshahi/CV-Builder/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/smamirshahi/CV-Builder/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/smamirshahi/CV-Builder/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/smamirshahi/CV-Builder/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/smamirshahi/CV-Builder/releases/tag/v0.1.0
