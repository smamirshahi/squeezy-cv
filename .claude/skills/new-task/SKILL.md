---
name: new-task
description: Handle a newly given task by tracking it as a GitHub issue — search existing issues first, update the match with the new content, or create a detailed new issue (with design and acceptance criteria). Use whenever the user gives a new task, feature, bug or change request, or says "/new-task".
argument-hint: <task description>
---

# New task → GitHub issue

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

## Working on it

Only start implementing when the user explicitly says to work on the task. Then follow the `work-on-issue` skill with that issue's ID. Otherwise stop after step 4.
