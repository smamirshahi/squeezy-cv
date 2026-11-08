---
name: work-on-issue
description: Work on a GitHub issue end to end — read the issue by ID, understand the acceptance criteria, create a feature branch, implement, add tests, run all checks, then open a PR and merge it to main. Use when the user says "work on issue 123", "/work-on-issue 123" or similar.
argument-hint: <issue-id>
---

# Work on an issue

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

- Add or update tests for the new behaviour (tests live next to the code as `*.test.ts(x)`; use `pnpm test:e2e` for real layout/PDF/editor behaviour).
- Make sure everything passes, as CI does:
  - `pnpm build`
  - `pnpm lint:check`
  - `pnpm format-check` (fix with `pnpm format-fix`)
  - `pnpm knip` (dead code)
  - `pnpm test`
- If anything fails, fix it and re-run. Never skip or weaken a test to get green. If something cannot be fixed, stop and report it.
- Check each acceptance criterion against the result.

## 5. PR and merge

- Push the branch and open a PR to `main` with `gh pr create`. The title mentions the issue; the body summarises the change, lists how each acceptance criterion is met, notes the tests, and includes `Closes #<id>`.
- Wait for CI (`gh pr checks --watch`). If it fails, fix and push.
- **Always merge.** Whenever you create a branch (for an issue or any other task), once everything is green (local checks and CI) merge it to `main` and delete the branch, unless the user explicitly says not to. Never stop at an open PR: `Closes #<id>` only closes the issue when the PR is merged.
- When green, merge to `main` (`gh pr merge --merge --delete-branch`, matching the repo's existing merge-commit history), then `git switch main && git pull`.
- Finish by telling the user what was done, the PR link, and anything left out or worth a follow-up issue.
