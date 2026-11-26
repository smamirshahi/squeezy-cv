# Security

## Reporting a problem

Please **do not open a public issue** for a security problem.

Use GitHub's private reporting instead: go to the **Security** tab of this repository and choose **Report a vulnerability**. Include what you found, how to reproduce it, and what you think the impact is.

This is a one-person project, so I can't promise a response time, but I will read every report and aim to reply within a couple of weeks.

## What is in scope

- The web app (browser mode and server mode) and the local server in `src/server`.
- How your data and AI keys are stored and handled. In browser mode data lives in your browser and the AI key in localStorage; in server mode data is JSON files in `data/` and keys are in `.env`.
- The masking of personal details before text is sent to an online AI provider. This is best effort and is not a guarantee.

## Out of scope

- Problems in a third-party AI provider or in the browser itself.
- Anything that needs access to your own computer or your own browser profile.
- The local server is built to be run on your own machine and only accepts local `Host`/`Origin` requests. It is not meant to be exposed to the internet.

## Supported versions

Only the latest release gets fixes.

## Please don't share real data

If you attach a file to a report, use fake data. Never send a real CV, API keys or tokens.
