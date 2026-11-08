# Codewars Challenge: Plan

Private league for a handful of friends. 5 rounds, 2 weeks each. One topic per round,
5 katas per round (2 easy, 2 medium, 1 hard). Completion is verified automatically from
the Codewars public API. Leaderboard per round and overall.

## How verification works (no Codewars login, no API key)

Public endpoints, confirmed today:

- `GET https://www.codewars.com/api/v1/users/:username`
  returns `honor`, `clan`, `ranks`. Used for login proof (see Auth) and profile.
- `GET https://www.codewars.com/api/v1/users/:username/code-challenges/completed?page=0`
  returns `[{ id, slug, name, completedAt, completedLanguages }]`, newest first, 200 per page.
- `GET https://www.codewars.com/api/v1/code-challenges/:slug`
  returns `name`, `rank.name` (kyu), `url`. Used when adding a kata to a round.

A kata counts for a player when its `completedAt` falls inside the round window
and `completedLanguages` includes `javascript` or `typescript` (rule, can be relaxed).

Gotcha: `completedAt` is the FIRST completion. Re-solving an old kata does not
update it. So every round's katas must be ones nobody has solved before. Easy to
check when adding a round: fetch each player's completed list and warn on overlap.

## Auth: username + shared password, then Codewars clan proof

No OAuth, no third party. Two steps, both required:

1. Enter your Codewars username (must be on the allowlist) and the shared league
   password (`LEAGUE_PASSWORD`, compared timing-safe). This sets a short-lived
   signed `pending` cookie (15 min).
2. The app shows an 8-char code. Set it as your Codewars **Clan** at
   codewars.com/users/edit and press Verify. The app reads your public profile,
   confirms the clan matches, then swaps the pending cookie for a signed 90-day
   session cookie `{ username, exp }` (Node `crypto` HMAC, no auth library).
   Afterwards set your clan to anything you like.

The clan code is `HMAC(AUTH_SECRET, username + date)`, valid today and yesterday,
and only shown after the password step, so nothing is stored server-side. The
password proves league membership; the clan proves you actually own the Codewars
account, so a leaked password alone cannot impersonate another player.

## Stack (lazy and secure)

- Next.js 15 App Router, TypeScript, Tailwind v4. Deploy on Vercel free tier.
- No database in v1. Two files in the repo:
  - `data/players.ts`: `[{ codewars: 'andrii_cw', name: 'Andrii' }]`
  - `data/rounds.ts`: `[{ n, topic, start, end, katas: [{ slug, tier }] }]`
  Adding a round = edit, commit, push. For devs that is less work than an admin UI.
- Scores computed on request from the Codewars API, cached 5 minutes with
  `fetch(url, { next: { revalidate: 300 } })`. 6 players = 6 requests per 5 min.
- Secrets: only `AUTH_SECRET` in Vercel env.
- Every page behind the session check in middleware. Unknown username = "not invited".

Upgrade path, only when needed: Postgres (Neon) + Drizzle for self-signup,
admin UI for rounds, frozen score snapshots, first-solver bonuses.

## Scoring

- Easy 10, Medium 20, Hard 40. 100 per round, 500 per season.
- Tiebreak: earlier timestamp of the last counted solve.
- Tier to kyu guideline: easy 7 to 6 kyu, medium 5 to 4 kyu, hard 3 to 2 kyu.
- Later, optional: +5 for first solver of each kata, streak bonus.

## Pages

1. `/` current round: topic, countdown, 5 kata cards with your status and link
   to Codewars, leaderboard with Round / Overall toggle.
2. `/rounds/[n]` any round. Past rounds frozen, future rounds hidden until start.
3. `/leaderboard` overall with a column per round.
4. `/login` username + clan code + verify. `/not-invited`.
5. Later: `/rules`.

## Build order

1. Scaffold Next.js + Tailwind. Login flow + allowlist + middleware. Deploy.
2. `lib/codewars.ts` (API client) and `lib/score.ts` (window filter + points)
   with one small test file.
3. UI from the chosen mockup (A Terminal, B Arcade, C Clean, D League).
4. Fill round 1 with real katas, run the overlap check.
5. Share the link, friends verify once, done.

## Topics (chosen)

1. Strings and Numbers (no regex)
2. Arrays and Functional JS
3. JS Internals
4. Async
5. Algorithms (tentative, may be swapped)

Design: option B, Arcade. Name: PROMPTLESS.

## Decisions to confirm

- Count only JS/TS solutions? (suggest yes)
- A kata must be solved during the round, prior solves never count. (forced by API)
- "Per week" leaderboard is read as "per round" (2 weeks). Say if you want weekly splits.
- App name. "Kata League" is a placeholder in the mockups.
