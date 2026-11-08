import { createHmac, timingSafeEqual } from 'node:crypto';

// ponytail: stateless HMAC auth, no DB, no auth lib. Rotate AUTH_SECRET to log everyone out.
const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set');
  return s;
};
const hmac = (s: string) => createHmac('sha256', secret()).update(s).digest('hex');
// Compare as equal-length digests: constant time, no length leak, never throws.
const safeEq = (a: string, b: string) => timingSafeEqual(Buffer.from(hmac(a)), Buffer.from(hmac(b)));
const day = (offset: number) => new Date(Date.now() - offset * 864e5).toISOString().slice(0, 10);

/** One shared password for the whole league. Everyone on the allowlist uses it; set it in env. */
export const passwordOk = (input: string) => {
  const pw = process.env.LEAGUE_PASSWORD;
  // ponytail: not configured = fail safe to the friendly "wrong password" UI, don't crash the page
  if (!pw) {
    console.error('LEAGUE_PASSWORD is not set');
    return false;
  }
  return safeEq(input.trim(), pw);
};

/** Code the player pastes into their Codewars "clan" field. Valid today and yesterday (UTC). */
export const clanCode = (username: string, dayOffset = 0) =>
  hmac(`clan|${username.toLowerCase()}|${day(dayOffset)}`).slice(0, 8).toUpperCase();

export const clanMatches = (username: string, clan: string | null | undefined) =>
  !!clan && [0, 1].some((o) => safeEq(clanCode(username, o), clan.trim().toUpperCase()));

export const SESSION_TTL_MS = 90 * 864e5; // ponytail: one cookie per season
export const PENDING_TTL_MS = 15 * 6e4; // 15 min to finish the clan step after the password check

// Namespaced signed tokens: a "pending" token can't be replayed as a "session" and vice versa.
const sign = (ns: string, username: string, exp: number) => `${username}|${exp}|${hmac(`${ns}|${username}|${exp}`)}`;
const verify = (ns: string, token: string | undefined): string | null => {
  const [username, exp, sig] = token?.split('|') ?? [];
  if (!username || !exp || !sig || Number(exp) < Date.now()) return null;
  return safeEq(sig, hmac(`${ns}|${username}|${exp}`)) ? username : null;
};

export const signSession = (username: string, exp = Date.now() + SESSION_TTL_MS) => sign('session', username, exp);
export const verifySession = (token: string | undefined) => verify('session', token);

/** Short-lived proof that the password check passed, carried to the clan-verify step. */
export const signPending = (username: string, exp = Date.now() + PENDING_TTL_MS) => sign('pending', username, exp);
export const verifyPending = (token: string | undefined) => verify('pending', token);
