# Hosting the browser version (Cloudflare Pages)

The browser version (`pnpm build:browser`, see #350) is a static site: all data stays in the
user's browser (IndexedDB). It is hosted on **Cloudflare Pages**, project name
**`mohammad-cv-builder`**, so the address is `https://mohammad-cv-builder.pages.dev`.

> **The address must not change.** IndexedDB data belongs to the origin (the exact address).
> A different address means an empty app for every user, unless they download a backup first
> (#447). If a custom domain is wanted later, set it up before real users arrive and keep it.
> Preview deploys (one per pull request) are other origins, so they start empty; that is normal.

## How it deploys

`.github/workflows/deploy.yml` builds with `pnpm build:browser` and uploads `dist` with
Wrangler:

- push to `main` → production (`mohammad-cv-builder.pages.dev`)
- pull request (not a draft, not from a fork) → preview at `<branch>.mohammad-cv-builder.pages.dev`

`public/_redirects` sends every path to `index.html`, so a deep link such as `/jobs` works.
`public/_headers` and `public/robots.txt` ask search engines not to index the site.

## One-time setup (needs your Cloudflare account)

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets**, name it
   `mohammad-cv-builder` (if the name is taken, pick another and change `PROJECT` in the
   workflow, and this file). Upload any file once; GitHub replaces it. Or from a terminal:
   `pnpm dlx wrangler pages project create mohammad-cv-builder --production-branch main`.
2. Create an API token: **My Profile → API Tokens → Create Token → Custom**, permission
   _Account → Cloudflare Pages → Edit_. Note the **Account ID** (right side of the dashboard).
3. In GitHub: **Settings → Secrets and variables → Actions** → add secrets
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## Keeping it private (Cloudflare Access)

The site is public on the internet by default (an unguessable name is not security). To let only
people you list in:

1. Cloudflare dashboard → **Zero Trust** (free plan, up to 50 users) → **Access → Applications →
   Add an application → Self-hosted**.
2. Application domains: add `mohammad-cv-builder.pages.dev` **and** `*.mohammad-cv-builder.pages.dev`
   (the second one covers the PR previews).
3. Policy: action **Allow**, rule **Emails** → the addresses of your testers. Login method:
   **One-time PIN** (they get a code by email; no account needed).
4. Add or remove testers any time by editing that policy.

Nothing in the repo is secret, because the app contains no data and no keys; Access only decides
who can open the page. Users enter their own AI key in the app later (#449).
