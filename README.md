# PROMPTLESS

Private Codewars league for friends. Design and reasoning: `PLAN.md`.

## Run locally

```
pnpm install
echo "AUTH_SECRET=$(openssl rand -hex 32)" > .env.local
echo "LEAGUE_PASSWORD=pick-a-shared-key" >> .env.local
pnpm dev
```

## Configure

Everything is in `data/league.ts`: app name, players (Codewars usernames), rounds, katas.
Edit, push, Vercel redeploys. No admin UI.

Katas must be ones nobody has solved before: Codewars keeps only the first completion date.

## Login

Two-step, both required. A player enters their Codewars username (must be on the
allowlist) and the shared league password, then sets a one-day code as their
Codewars **Clan** at codewars.com/users/edit and presses Verify. The app checks
the public profile and sets a signed cookie for 90 days. One password for
everyone; the clan step proves each player owns their account.

## Deploy

Vercel, two env vars: `AUTH_SECRET` and `LEAGUE_PASSWORD`.

## Test

```
pnpm test
```
