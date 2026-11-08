import test from 'node:test';
import assert from 'node:assert/strict';
import type { Round } from '@/data/league';
import { clanCode, clanMatches, passwordOk, signPending, signSession, verifyPending, verifySession } from './auth';
import { rank, roundStatus, scoreRound } from './score';

process.env.AUTH_SECRET = 'test-secret';
process.env.LEAGUE_PASSWORD = 'open-sesame';

const round: Round = {
  n: 1,
  topic: 't',
  start: '2026-01-01T00:00:00Z',
  end: '2026-01-14T23:59:59Z',
  katas: [
    { slug: 'a', tier: 'easy' },
    { slug: 'b', tier: 'hard' },
    { slug: 'c', tier: 'medium' },
  ],
};
const done = (slug: string, completedAt: string, lang = 'javascript') => ({ id: slug, slug, name: slug, completedAt, completedLanguages: [lang] });

test('scoreRound counts only in-window JS/TS solves', () => {
  const s = scoreRound(round, [
    done('a', '2026-01-02T10:00:00.000Z'),
    done('b', '2025-12-31T23:00:00.000Z'), // before the round: lost forever
    done('c', '2026-01-03T00:00:00.000Z', 'python'),
  ]);
  assert.equal(s.points, 10);
  assert.equal(s.solved, 1);
  assert.equal(s.total, 3);
  assert.equal(s.lastSolve, '2026-01-02T10:00:00.000Z');
  assert.equal(s.results[1].solvedAt, null);
});

test('rank: points desc, earlier last solve breaks ties, never-solved last', () => {
  const r = rank([
    { n: 'late', points: 10, lastSolve: '2026-01-05T00:00:00.000Z' },
    { n: 'none', points: 0, lastSolve: null },
    { n: 'tie-null', points: 10, lastSolve: null }, // unreachable in practice; comparator must still put it after dated ties
    { n: 'early', points: 10, lastSolve: '2026-01-02T00:00:00.000Z' },
    { n: 'top', points: 50, lastSolve: '2026-01-09T00:00:00.000Z' },
  ]);
  assert.deepEqual(r.map((x) => x.n), ['top', 'early', 'late', 'tie-null', 'none']);
});

test('roundStatus', () => {
  assert.equal(roundStatus(round, Date.parse('2025-12-31T00:00:00Z')), 'upcoming');
  assert.equal(roundStatus(round, Date.parse('2026-01-07T00:00:00Z')), 'live');
  assert.equal(roundStatus(round, Date.parse('2026-01-15T00:00:00Z')), 'finished');
});

test('session: roundtrip, tamper, expiry, missing', () => {
  const t = signSession('andrii');
  assert.equal(verifySession(t), 'andrii');
  assert.equal(verifySession(t.slice(0, -1) + (t.endsWith('0') ? '1' : '0')), null);
  assert.equal(verifySession(signSession('andrii', Date.now() - 1)), null);
  assert.equal(verifySession(undefined), null);
});

test('pending token: roundtrip, namespaced apart from session, expiry', () => {
  assert.equal(verifyPending(signPending('andrii')), 'andrii');
  // namespaces must not cross: a session token is not a valid pending token, and vice versa
  assert.equal(verifyPending(signSession('andrii')), null);
  assert.equal(verifySession(signPending('andrii')), null);
  assert.equal(verifyPending(signPending('andrii', Date.now() - 1)), null);
});

test('passwordOk: trims, matches shared password, rejects others', () => {
  assert.ok(passwordOk('  open-sesame  '));
  assert.ok(!passwordOk('nope'));
  assert.ok(!passwordOk(''));
});

test('passwordOk: unset env fails safe, never throws', () => {
  const saved = process.env.LEAGUE_PASSWORD;
  delete process.env.LEAGUE_PASSWORD;
  assert.doesNotThrow(() => assert.equal(passwordOk('anything'), false));
  process.env.LEAGUE_PASSWORD = saved;
});

test('clan code: case-insensitive match, rejects others', () => {
  const c = clanCode('Andrii');
  assert.equal(c.length, 8);
  assert.ok(clanMatches('andrii', ` ${c.toLowerCase()} `));
  assert.ok(!clanMatches('andrii', 'NOPE1234'));
  assert.ok(!clanMatches('andrii', undefined));
  assert.notEqual(clanCode('andrii'), clanCode('olena'));
});
