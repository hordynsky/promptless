import { LANGS, POINTS, rounds, type Round, type Tier } from '@/data/league';
import type { Completed } from './codewars';

export type RoundStatus = 'upcoming' | 'live' | 'finished';

export const roundStatus = (r: Round, now = Date.now()): RoundStatus =>
  now < Date.parse(r.start) ? 'upcoming' : now > Date.parse(r.end) ? 'finished' : 'live';

export const currentRound = (now = Date.now()) =>
  rounds.find((r) => roundStatus(r, now) !== 'finished') ?? rounds[rounds.length - 1];

export type KataResult = { slug: string; tier: Tier; points: number; solvedAt: string | null };
export type Score = { points: number; solved: number; total: number; lastSolve: string | null; results: KataResult[] };

/** Points for one round. A kata counts if first completed inside the window in an allowed language. */
export function scoreRound(round: Round, completed: Completed[]): Score {
  const start = Date.parse(round.start);
  const end = Date.parse(round.end);
  const results = round.katas.map((k) => {
    const c = completed.find((x) => x.slug === k.slug);
    const t = c ? Date.parse(c.completedAt) : NaN;
    const ok = !!c && t >= start && t <= end && (LANGS.length === 0 || c.completedLanguages.some((l) => LANGS.includes(l)));
    return { slug: k.slug, tier: k.tier, points: ok ? POINTS[k.tier] : 0, solvedAt: ok && c ? c.completedAt : null };
  });
  return summarize(results, round.katas.length);
}

/** Sum of every round that has started. */
export function scoreSeason(completed: Completed[], now = Date.now()): Score {
  const played = rounds.filter((r) => roundStatus(r, now) !== 'upcoming');
  return summarize(
    played.flatMap((r) => scoreRound(r, completed).results),
    played.reduce((n, r) => n + r.katas.length, 0),
  );
}

function summarize(results: KataResult[], total: number): Score {
  const times = results.flatMap((r) => (r.solvedAt ? [r.solvedAt] : [])).sort();
  return { points: results.reduce((s, r) => s + r.points, 0), solved: times.length, total, lastSolve: times.at(-1) ?? null, results };
}

/** Points desc, then whoever got there first. Never solved sorts last. */
const at = (s: string | null) => (s ? Date.parse(s) : Infinity);
export const rank = <T extends { points: number; lastSolve: string | null }>(rows: T[]) =>
  [...rows].sort((a, b) => b.points - a.points || at(a.lastSolve) - at(b.lastSolve) || 0);
