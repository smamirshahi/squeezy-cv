---
name: testing-rules
description: Rules for tests in this repo — cover everything you build or change with tests of every suitable type (unit, component, server, Playwright e2e), and never change a failing test just to make it pass without explaining the cause to the user first. Use whenever you implement, change or fix code, or when a test fails.
---

# Testing rules

These apply to every piece of work (features, fixes, refactors, dead-code removal).

## 1. Test as much as possible, cover everything

For everything you add or change, write tests. Cover the happy path, edge cases (empty, missing, invalid, huge input), error paths and regressions for bugs you fix. Use every type that fits, from the smallest to the real browser:

- **Unit tests (Vitest, node):** pure logic in `src/shared/**`, store reducers and helpers. Next to the code as `*.test.ts`.
- **Component tests (Vitest + jsdom + Testing Library):** start the file with `// @vitest-environment jsdom`. See `pages/editor-page/editors.test.tsx`. Cover rendering, interaction, keyboard use and disabled/locked states.
- **Server tests:** routes through `buildServer` with fake storage / fake `PdfRenderer` / fake AI client; check validation, status codes and error cases.
- **End-to-end tests (Playwright via Vitest, `pnpm test:e2e`, `src/e2e/*.e2e.ts`):** anything about real layout, pagination, PDF output, drag and drop, keyboard flows and full user journeys, which jsdom cannot show. Needs `pnpm exec playwright install chromium` once.

Pick the lowest level that proves the behaviour, and add a higher level when the behaviour crosses layers (UI + server + PDF). A UI change usually needs a component test, and an e2e test when layout or the real browser matters. Run `pnpm test` and, when UI/PDF/server wiring was touched, `pnpm test:e2e`. Say in the final report which test types you added and anything you could not cover and why.

## 2. Never change a test just to make it pass

When an existing test fails after your change:

1. **Find out why first.** Read the failure and the test; decide whether the code is wrong or the test is outdated.
2. **If the code is wrong, fix the code**, not the test.
3. **If the test must change, stop and tell the user before (or together with) the change**, with details:
   - which test (file and name) failed and the exact failure message
   - what in your change caused it to fail
   - why the old expectation is no longer right (the intended behaviour changed) or why the test was wrong/brittle
   - exactly what you changed in the test (old vs new expectation)
4. Do not weaken tests to get green: no deleting assertions, loosening matchers, adding `skip`/`only`, raising timeouts or snapshot-updating blindly. Removing a test is only allowed when the code it tested was removed, and then say so.
5. Keep such changes small and list them separately in the final report (and in the PR description) so the user can review them.
