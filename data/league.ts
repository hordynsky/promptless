// The whole league lives here. Edit, push, Vercel redeploys. No admin UI on purpose.

export const APP_NAME = 'PROMPTLESS';
export const TAGLINE = 'pre-AI coding, recalled by hand';
export const TZ = 'Europe/Kyiv';

export type Player = { codewars: string; name: string };
// ponytail: allowlist in code; add a line to invite a friend
export const players: Player[] = [
  { codewars: 'hordynsky', name: 'Andryusha' }
];
export const findPlayer = (username: string) =>
  players.find((p) => p.codewars.toLowerCase() === username.trim().toLowerCase());

export type Tier = 'easy' | 'medium' | 'hard';
export const POINTS: Record<Tier, number> = { easy: 10, medium: 20, hard: 40 };
export const LANGS = ['javascript', 'typescript']; // ponytail: JS/TS only; [] = any language counts

export type Round = {
  n: number;
  topic: string;
  start: string; // ISO with offset
  end: string;
  katas: { slug: string; tier: Tier }[]; // name/kyu/url are fetched from Codewars
};

// Katas must be ones nobody has solved before: Codewars keeps only the FIRST completion date.
export const rounds: Round[] = [
  {
    n: 1,
    topic: 'Strings & Numbers',
    start: '2026-11-07T00:00:00+02:00',
    end: '2026-11-22T23:59:59+02:00',
    katas: [
      { slug: 'valid-braces', tier: 'easy' }, // 6 kyu
      { slug: 'persistent-bugger', tier: 'easy' }, // 6 kyu
      { slug: 'string-incrementer', tier: 'medium' }, // 5 kyu
      { slug: 'sum-strings-as-numbers', tier: 'medium' }, // 4 kyu
      { slug: 'rail-fence-cipher-encoding-and-decoding', tier: 'hard' }, // 3 kyu
    ],
  },
  { n: 2, topic: 'Arrays & Functional JS', start: '2026-11-23T00:00:00+02:00', end: '2026-12-06T23:59:59+02:00', katas: [] },
  { n: 3, topic: 'JS Internals', start: '2026-12-07T00:00:00+02:00', end: '2026-12-20T23:59:59+02:00', katas: [] },
  { n: 4, topic: 'Async', start: '2026-12-21T00:00:00+02:00', end: '2027-01-03T23:59:59+02:00', katas: [] },
  { n: 5, topic: 'Algorithms', start: '2027-01-04T00:00:00+02:00', end: '2027-01-17T23:59:59+02:00', katas: [] },
];
