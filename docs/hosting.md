# Hosting the browser version (Cloudflare Pages)

The browser version (`pnpm build:browser`, see #350) is a static site: all data stays in the
user's browser (IndexedDB). It is hosted on **Cloudflare Pages**, project name
**`squeezy-cv`**, so the address is `https://squeezy-cv.pages.dev`.

> **The address must not change.** IndexedDB data belongs to the origin (the exact address).
> A different address means an empty app for every user, unless they download a backup first
> (#447). The address changed once,
> when the app was renamed (#467, #480); a Pages project cannot be renamed. If a custom domain is
> wanted later, set it up before real users arrive and keep it. Preview deploys (one per pull
> request) are other origins, so they start empty; that is normal.

## How it deploys

`.github/workflows/deploy.yml` builds with `pnpm build:browser` and uploads `dist` with
Wrangler:

- push to `main` → production (`squeezy-cv.pages.dev`)
- pull request (not a draft, not from a fork) → preview at `<branch>.squeezy-cv.pages.dev`

`public/_redirects` sends every path to `index.html`, so a deep link such as `/jobs` works.
`public/_headers` and `public/robots.txt` let search engines index the site (it is open to everyone, #457). To close it again, put `Disallow: /` in `robots.txt` and `X-Robots-Tag: noindex, nofollow` in `_headers`.

## One-time setup (needs your Cloudflare account)

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets**, name it
   `squeezy-cv` (if the name is taken, pick another and change `PROJECT` in the
   workflow, and this file). Upload any file once; GitHub replaces it. Or from a terminal:
   `pnpm dlx wrangler pages project create squeezy-cv --production-branch main`.
2. Create an API token: **My Profile → API Tokens → Create Token → Custom**, permission
   _Account → Cloudflare Pages → Edit_. Note the **Account ID** (right side of the dashboard).
3. In GitHub: **Settings → Secrets and variables → Actions** → add secrets
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## Keeping it private (optional, Cloudflare Access)

The live site is **open to everyone** since the repository went public (#457); there is no
Access application on production any more. If you ever want to close it again (or protect only
the PR previews, `*.squeezy-cv.pages.dev`), this is how. To let only people you list in:

1. Cloudflare dashboard → **Zero Trust** (free plan, up to 50 users) → **Access → Applications →
   Add an application → Self-hosted**.
2. Application domains: add `squeezy-cv.pages.dev` **and** `*.squeezy-cv.pages.dev`
   (the second one covers the PR previews).
3. Policy: action **Allow**, rule **Emails** → the addresses of your testers. Login method:
   **One-time PIN** (they get a code by email; no account needed).
4. Add or remove testers any time by editing that policy.

Nothing in the repo is secret, because the app contains no data and no keys; Access only decides
who can open the page. Users enter their own AI key in the app later (#449).

## Current setup (done, 2026-11)

- Cloudflare Pages project **`squeezy-cv`** (Direct Upload; it was created in the dashboard via "Continue to Pages", not as a Workers project), address `https://squeezy-cv.pages.dev`.
- GitHub secrets `CLOUDFLARE_API_TOKEN` (Account → Cloudflare Pages → Edit, expires after one year: renew it) and `CLOUDFLARE_ACCOUNT_ID` are used by `deploy.yml`. They are never in the repo or in chat.
- Production is open to everyone. Cloudflare Access (Zero Trust → Access controls → Applications → "squeezy-cv - Cloudflare Pages") was removed for production when the repo went public; if it is kept for previews only, the destination is `*.squeezy-cv.pages.dev`.
- The first production upload was made by hand (`pnpm build:browser`, then `pnpm dlx wrangler login` and `wrangler pages deploy dist --project-name=squeezy-cv --branch=main`). Normal deploys come from `deploy.yml`.

## Who can log in (only if Access is switched on)

Edit the policy: Zero Trust → Access controls → Applications → open the application → Policies → "Allow Members" → Edit → Include → Emails. Add or remove addresses and save. Use only **Emails** (or Emails ending in) and no Everyone rule, and no second policy that allows more people. Test with an address that is not listed: it must be refused and get no code. A removed person keeps an open session until it ends; revoke it under Zero Trust → Team & Resources → Users, or shorten the session duration in the application's settings.

## What deploys when

- Merge or push to `main` → production, automatically (needs `deploy.yml` on `main` and the two secrets; without the secrets the job logs that it skipped and does not fail).
- Pull request with the `preview` label, not a draft and not from a fork → preview at `<branch>.squeezy-cv.pages.dev` (also behind Access). Without the label, and for draft pull requests, nothing deploys (to save Actions minutes, #470). A merge that only changes docs (`**.md`, `.claude`, `.githooks`, `data.example`) does not redeploy production.
- `deploy.yml` does **not** run tests or lint; `ci.yml` does that on pull requests, so merge through pull requests. A format change needs a migration step because testers keep real data in their browsers (see `CLAUDE.md`). Never change the project name or address.

To keep data in a folder that Drive, Dropbox, iCloud or OneDrive syncs (browser and server mode), see [sync-with-a-folder.md](sync-with-a-folder.md).

## Local development is unchanged

- `pnpm dev`: server mode as before (web :5173, server :3001, data in `data/`, Chromium PDF, keys in `.env`).
- `pnpm dev:browser`: the browser version locally (data in IndexedDB of that browser profile, no server). `localhost:5173` in server mode and in browser mode do not share data.
- `pnpm build:browser` then `pnpm preview`: tries the installable, offline build locally.
- To move your own `data/` into the hosted app: in server mode press Data → Download backup, then on the hosted site Data → Restore from backup.
