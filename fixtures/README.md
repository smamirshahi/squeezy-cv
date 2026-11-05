# Fixtures

Fake data used by tests and by the dev server.

- `sample-cv.json` — a valid CV export in the current format (invented person).

Put your real CV in `data/` (git-ignored). `data.example/` shows the layout.

- `legacy-cv-v0.json` — the same fake person in the oldest export shape (bullets as `{id, text}`, no `shouldShow` on education or skills, no `bulletPointIcon`). Used by the migration tests.
