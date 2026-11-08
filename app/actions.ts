'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { findPlayer } from '@/data/league';
import { clanMatches, passwordOk, PENDING_TTL_MS, SESSION_TTL_MS, signPending, signSession, verifyPending } from '@/lib/auth';
import { getProfile } from '@/lib/codewars';

const COOKIE = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' } as const;

/** Step 1: username on the allowlist + shared password. On success, move to the clan step. */
export async function login(form: FormData) {
  const p = findPlayer(String(form.get('username') ?? ''));
  if (!p) redirect('/login?err=invite');
  const back = `/login?u=${encodeURIComponent(p.codewars)}`;
  if (!passwordOk(String(form.get('password') ?? ''))) redirect(`${back}&err=pw`);
  (await cookies()).set('pending', signPending(p.codewars), { ...COOKIE, maxAge: PENDING_TTL_MS / 1000 });
  redirect(back);
}

/** Step 2: with the password already proven, verify the Codewars clan code, then sign in. */
export async function verify(form: FormData) {
  const p = findPlayer(String(form.get('username') ?? ''));
  if (!p) redirect('/login?err=invite');
  const jar = await cookies();
  const back = `/login?u=${encodeURIComponent(p.codewars)}`;
  if (verifyPending(jar.get('pending')?.value) !== p.codewars) redirect(`${back}&err=expired`);
  const profile = await getProfile(p.codewars);
  if (!profile) redirect(`${back}&err=api`);
  if (!clanMatches(p.codewars, profile.clan)) redirect(`${back}&err=clan`);
  jar.set('session', signSession(p.codewars), { ...COOKIE, maxAge: SESSION_TTL_MS / 1000 });
  jar.delete('pending');
  redirect('/');
}

export async function logout() {
  const jar = await cookies();
  jar.delete('session');
  jar.delete('pending');
  redirect('/login');
}
