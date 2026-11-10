---
name: work-on-issue
description: Work on a GitHub issue end to end — read the issue by ID, understand the acceptance criteria, create a feature branch, implement, add tests, run all checks, then open a PR and merge it to main. Use when the user says "work on issue 123", "/work-on-issue 123" or similar.
argument-hint: <issue-id>
---

# Work on an issue

> **Never commit directly to `main`.** Not even for a small change, a doc line or a follow-up. Every change, whatever its size, starts on a new branch (`git switch -c <type>/<issue>-<description>`) and reaches `main` only by merging that branch. **No branch exists without a GitHub issue:** its name starts with the issue number after the type (e.g. `feature/330-short-name`, `chore/330-...`); create or find the issue first. If you are on `main` with changes, create the branch first. A local hook (`.githooks/pre-commit`, enabled by `git config core.hooksPath .githooks`) refuses commits on `main` and on branches without an issue number.

The issue ID is the argument (e.g. `/work-on-issue 101`). If none is given, ask for it. The `new-task` skill calls this skill by default for every new task, so it runs without the user asking.

## 1. Read the issue

- `gh issue view <id> --comments` (also check linked issues/PRs and labels).
- Write down, briefly, what needs to be done and the **acceptance criteria**. If the criteria are missing or ambiguous, ask the user before coding.
- Read the relevant parts of `CLAUDE.md` and the code the issue touches.

## 2. Create the branch

- Start from an up-to-date `main`: `git switch main && git pull`.
- Name the branch `feature/<issue-id>-<short-kebab-description>`, e.g. `feature/101-ai-import`. The issue ID comes first, so create the issue before the branch.
- If there are uncommitted changes that are not part of this issue, stop and ask what to do with them.

## 3. Implement

- Do only what the issue asks for; follow the conventions in `CLAUDE.md` (path aliases, no relative imports, `useAppDispatch`/`useAppSelector`, Prettier style).
- Commit in small, meaningful steps with messages that mention the issue (`... (#<id>)`).

## 4. Test and check

- **Tests are paused for now** (the UI, UX and logic are still changing, and running them costs too much time and tokens): do NOT write or update tests, and do NOT run `pnpm test` or `pnpm test:e2e` before merging. Remove this note (and the one in `testing-rules`), and uncomment the test steps in `.github/workflows/ci.yml`, when the user says tests are back on.
- Make sure these pass:
  - `pnpm build`
  - `pnpm lint:check`
  - `pnpm format-check` (fix with `pnpm format-fix`)
  - `pnpm knip` (dead code)
- If anything fails, fix it and re-run. Never skip or weaken a test to get green. If something cannot be fixed, stop and report it.
- Check each acceptance criterion against the result.

## 5. PR and merge

- Push the branch and open a PR to `main` with `gh pr create`. The title mentions the issue; the body summarises the change, lists how each acceptance criterion is met, notes the tests, and includes `Closes #<id>`.
- CI's test steps are paused too (commented out in `ci.yml`). Wait for CI (`gh pr checks --watch`); it now runs only build, lint, format and knip. If it fails, fix and push.
- **Always merge.** Whenever you create a branch (for an issue or any other task), once the local checks are green merge it to `main` and delete the branch, unless the user explicitly says not to. Never stop at an open PR: `Closes #<id>` only closes the issue when the PR is merged.
- When green, merge to `main` (`gh pr merge --merge --delete-branch`, matching the repo's existing merge-commit history), then `git switch main && git pull`.
- Finish by telling the user what was done, the PR link, and anything left out or worth a follow-up issue.
