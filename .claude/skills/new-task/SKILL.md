---
name: new-task
description: Handle a newly given task end to end — track it as a GitHub issue (search first, update the match or create a detailed new one), then branch from main, implement, test and merge to main, unless the user says to only create the issue. Use whenever the user gives a new task, feature, bug or change request, or says "/new-task".
argument-hint: <task description>
---

# New task → GitHub issue

> **Never commit directly to `main`.** Not even for a small change, a doc line or a follow-up. Every change, whatever its size, starts on a new branch (`git switch -c <type>/<issue>-<description>`) and reaches `main` only by merging that branch. **No branch exists without a GitHub issue:** its name starts with the issue number after the type (e.g. `feature/330-short-name`, `chore/330-...`); create or find the issue first. If you are on `main` with changes, create the branch first. A local hook (`.githooks/pre-commit`, enabled by `git config core.hooksPath .githooks`) refuses commits on `main` and on branches without an issue number.

When the user gives a new task, make sure it is tracked in the GitHub issues before anything else.

## Steps

1. **Check for an existing issue.** Search open and closed issues (`gh issue list --state all --search "<keywords>"`, try several keywords; also skim the titles of the roadmap issues). Read any likely match with `gh issue view <id>`.
2. **If an issue already exists:** update it with the content the user gave (`gh issue edit <id> --body ...` or `gh issue comment <id>`). Keep what is already there; merge the new content in, do not throw away existing details or acceptance criteria.
3. **If none exists:** create a new issue (`gh issue create`) with as much detail as possible:
   - Context / problem and the goal
   - What to build or change, including affected areas of the codebase when known
   - The **design**, if there is one (link, screenshot, artifact URL such as the design-b artifact, or Figma). Add it to the issue.
   - **Acceptance criteria** as a checklist (`- [ ] ...`)
   - Labels that fit (for example `design-b` for the workspace redesign), and edge cases or out-of-scope notes
4. **Report back** with the issue number and link, and say whether it was updated or created.

## Working on it (the default)

**Do not wait to be asked.** Whenever the user gives a task, bug, feature or change request (a screenshot with a remark counts), run the whole flow: issue (steps 1-4), then the `work-on-issue` skill with that issue's ID: a branch named from the issue ID, started from an up-to-date `main`, implement, test, PR, merge to `main`. The user has said they do not want to repeat this each time.

- **Only create the issue** (stop after step 4) when the user says so explicitly, for example "only create an issue" or "don't work on it".
- Several tasks in one message or sent while you work: one issue, one branch and one merge **each**, one after the other. Never mix two tasks in one branch.
- Questions ("is this needed?") are answered first; start the flow when the user agrees or the intent is plain.
- Every merge to `main` bumps the version (minor or patch, major only after asking), as written in `work-on-issue` step 4.
- Uncommitted work that belongs to an earlier task is finished and merged first.
