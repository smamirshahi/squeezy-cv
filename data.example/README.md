Copy this folder to `data/` and replace the contents with your own CV.
`data/` is git-ignored so personal details never get committed.

To version and back up your data, make `data/` its own **private** git repository
(`git init` in it, add a private remote). The server then commits after every save;
push with `pnpm data:push`. Layout: `vault.json`, `templates/`, `jobs/`, `applications/`.

`cv-export.json` is a fake CV in the old export format, to try **Import JSON**.
If you have `variants/*.json` from before version 0.2, they are still read (each
becomes a template plus a job the first time you save).
