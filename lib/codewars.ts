import { cacheLife } from 'next/cache';

const API = 'https://www.codewars.com/api/v1';

export type Completed = { id: string; slug: string; name: string; completedAt: string; completedLanguages: string[] };
export type Kata = { slug: string; name: string; rank: string; url: string };
export type Profile = { username: string; clan?: string | null };

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) throw new Error(`codewars ${res.status} ${path}`);
  return res.json();
}

/** Always fresh: only used for the clan check at login. null = profile could not be loaded. */
export const getProfile = (username: string): Promise<Profile | null> =>
  get<Profile>(`/users/${encodeURIComponent(username)}`, { cache: 'no-store' }).catch((e) => {
    console.error(e);
    return null;
  });

/** Completed katas, newest first, back to `since`. Cached 5 minutes. */
export async function getCompleted(username: string, since: string): Promise<Completed[]> {
  'use cache';
  cacheLife({ revalidate: 300, expire: 3600 });
  const out: Completed[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, totalPages } = await get<{ data: Completed[]; totalPages: number }>(
      `/users/${encodeURIComponent(username)}/code-challenges/completed?page=${page}`,
    );
    out.push(...data);
    const oldest = data.at(-1)?.completedAt;
    if (page + 1 >= totalPages || !oldest || Date.parse(oldest) < Date.parse(since)) break;
  }
  return out;
}

/** Kata name, rank ("6 kyu", "1 dan", "beta"), url. Cached a day. */
export async function getKata(slug: string): Promise<Kata> {
  'use cache';
  cacheLife('days');
  const k = await get<{ name: string; url: string; rank: { name: string | null } }>(`/code-challenges/${encodeURIComponent(slug)}`);
  return { slug, name: k.name, rank: k.rank.name ?? 'beta', url: k.url };
}
