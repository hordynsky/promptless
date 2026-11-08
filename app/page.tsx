import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { APP_NAME, POINTS, TAGLINE, TZ, findPlayer, players, rounds, type Tier } from '@/data/league';
import { verifySession } from '@/lib/auth';
import { getCompleted, getKata, type Completed, type Kata } from '@/lib/codewars';
import { currentRound, rank, roundStatus, scoreRound, scoreSeason } from '@/lib/score';
import { logout } from './actions';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
const RANK_COLOR = ['text-gold', 'text-silver', 'text-bronze'];
const ordinal = (n: number) => `${n}${['TH', 'ST', 'ND', 'RD'][n % 10 > 3 || Math.floor(n / 10) === 1 ? 0 : n % 10]}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TZ });
const countdown = (to: string) => {
  const ms = Math.max(0, Date.parse(to) - Date.now());
  return [ms / 864e5, (ms % 864e5) / 36e5, (ms % 36e5) / 6e4].map((n) => String(Math.floor(n)).padStart(2, '0')).join(':');
};
const td = 'whitespace-nowrap border-b-2 border-dashed border-line p-3 font-medium';

export default function Page(props: PageProps<'/'>) {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="panel p-6 font-px text-[10px] text-cyan">LOADING...</div>
        </Shell>
      }
    >
      <Dashboard searchParams={props.searchParams} />
    </Suspense>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-6 pt-7 pb-14">{children}</main>;
}

async function Dashboard({ searchParams }: { searchParams: PageProps<'/'>['searchParams'] }) {
  await connection(); // request time: Date.now() below must never be prerendered
  const me = verifySession((await cookies()).get('session')?.value);
  if (!me || !findPlayer(me)) redirect('/login'); // removed from the allowlist = out, even with a valid cookie
  const { r, tab } = await searchParams;
  const round = rounds.find((x) => x.n === Number(r)) ?? currentRound();
  const status = roundStatus(round);
  const maxPts = round.katas.reduce((s, k) => s + POINTS[k.tier], 0);

  const [katas, fetched] = await Promise.all([
    status === 'upcoming'
      ? Promise.resolve<Kata[]>([])
      : Promise.all(
          round.katas.map((k) =>
            // one bad slug or a Codewars hiccup degrades to a plain card instead of a 500 for everyone
            getKata(k.slug).catch((e): Kata => {
              console.error(e);
              return { slug: k.slug, name: k.slug, rank: '?', url: `https://www.codewars.com/kata/${k.slug}` };
            }),
          ),
        ),
    Promise.all(
      players.map(async (p): Promise<[string, Completed[] | null]> => {
        try {
          return [p.codewars, await getCompleted(p.codewars, rounds[0].start)];
        } catch (e) {
          console.error(e);
          return [p.codewars, null];
        }
      }),
    ),
  ]);
  const byUser = new Map(fetched);
  const failed = fetched.filter(([, c]) => !c).map(([u]) => u);
  const roundRows = rank(players.map((p) => ({ ...p, ...scoreRound(round, byUser.get(p.codewars) ?? []) })));
  const seasonRows = rank(players.map((p) => ({ ...p, ...scoreSeason(byUser.get(p.codewars) ?? []) })));
  const rows = tab === 'season' ? seasonRows : roundRows;
  const mine = roundRows.find((p) => p.codewars === me);
  const credits = seasonRows.find((p) => p.codewars === me)?.points ?? 0;
  const gap = mine ? roundRows[0].points - mine.points : 0;

  return (
    <Shell>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="font-px text-lg text-cyan no-underline [text-shadow:3px_3px_0_var(--color-magenta)]">
          {APP_NAME}
        </Link>
        <nav aria-label="Rounds" className="flex flex-wrap gap-2">
          {rounds.map((x) => (
            <Link key={x.n} href={`/?r=${x.n}`} className={cx('pbtn', x.n === round.n ? 'pbtn-on' : 'pbtn-off')}>
              R{x.n}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-4 font-px text-[10px] text-yellow">
          <span>1UP {(mine?.name ?? me).toUpperCase()}</span>
          <span className="text-muted">CREDITS {credits}</span>
          <form action={logout}>
            <button className="pbtn pbtn-magenta">EXIT</button>
          </form>
        </div>
      </header>

      <section className="panel flex flex-wrap items-center justify-between gap-6 p-7">
        <div className="flex flex-col gap-3">
          <span className="font-px text-[10px] text-muted">
            ROUND {round.n} OF {rounds.length}
          </span>
          <h1 className="m-0 font-px text-[22px] text-yellow [text-shadow:4px_4px_0_var(--color-magenta)] sm:text-[30px]">
            {round.topic.toUpperCase()}
          </h1>
          <span className="text-muted">
            {fmtDate(round.start)} – {fmtDate(round.end)} · {round.katas.length} stages · {maxPts} pts max
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-px text-[10px] text-muted">
            {status === 'upcoming' ? 'STARTS IN' : status === 'live' ? 'TIME LEFT' : 'FINAL'}
          </span>
          <span className="font-px text-[32px] text-cyan">
            {status === 'finished' ? 'GAME OVER' : countdown(status === 'upcoming' ? round.start : round.end)}
          </span>
          {status !== 'finished' && <span className="text-[13px] text-muted">days : hours : minutes</span>}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="m-0 font-px text-sm text-magenta">STAGE SELECT</h2>
        {status === 'upcoming' ? (
          <div className="panel p-6 font-px text-[10px] leading-loose text-muted">
            LOCKED. STAGES REVEAL AT KICK-OFF. DO NOT SOLVE ANYTHING EARLY: CODEWARS ONLY COUNTS THE FIRST COMPLETION.
          </div>
        ) : katas.length === 0 ? (
          <div className="panel p-6 font-px text-[10px] leading-loose text-muted">NO STAGES YET. ADD KATAS IN data/league.ts</div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {katas.map((k, i) => {
              const tier = round.katas[i].tier;
              const solved = mine?.results[i]?.solvedAt;
              return (
                <div
                  key={k.slug}
                  className={cx('panel flex min-w-0 flex-[1_1_180px] flex-col gap-2.5 p-4', solved ? 'border-green' : tier === 'hard' && 'border-magenta')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-px text-[10px] text-muted">STAGE {i + 1}</span>
                    <Hearts tier={tier} />
                  </div>
                  <a href={k.url} target="_blank" rel="noreferrer" className="text-[17px] leading-tight font-bold text-text no-underline hover:text-cyan">
                    {k.name}
                  </a>
                  <div className="text-[13px] text-muted">
                    {k.rank} · {tier}
                    {tier === 'hard' && ' · boss stage'}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    {solved ? (
                      <span className="font-px text-[10px] text-green">CLEARED</span>
                    ) : (
                      <a href={k.url} target="_blank" rel="noreferrer" className="pbtn">
                        PLAY ▶
                      </a>
                    )}
                    <span className={cx('font-px text-xs', solved ? 'text-yellow' : 'text-muted')}>+{POINTS[tier]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-wrap items-start gap-6">
        <div className="panel min-w-0 flex-[1_1_560px] p-5 pb-2.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 font-px text-sm text-yellow [text-shadow:3px_3px_0_var(--color-magenta)]">HIGH SCORES</h2>
            <div className="flex gap-2">
              <Link href={`/?r=${round.n}`} className={cx('pbtn', tab !== 'season' ? 'pbtn-on' : 'pbtn-off')}>
                ROUND
              </Link>
              <Link href={`/?r=${round.n}&tab=season`} className={cx('pbtn', tab === 'season' ? 'pbtn-on' : 'pbtn-off')}>
                SEASON
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['RANK', 'NAME', 'STAGES', 'SCORE'].map((h) => (
                    <th key={h} className="border-b-[3px] border-line p-3 text-left font-px text-[10px] text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.codewars} className={cx(p.codewars === me && 'bg-[#241a55]')}>
                    <td className={cx(td, 'font-px text-[11px]', RANK_COLOR[i] ?? 'text-muted')}>{ordinal(i + 1)}</td>
                    <td className={td}>
                      {p.name.toUpperCase()}
                      {p.codewars === me && <span className="ml-2 font-px text-[10px] text-green">◄ YOU</span>}
                    </td>
                    <td className={td}>
                      {p.solved}/{p.total}
                    </td>
                    <td className={cx(td, 'font-px text-xs', RANK_COLOR[i])}>{String(p.points).padStart(6, '0')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {failed.length > 0 && <p className="mt-3 font-px text-[10px] text-magenta">SYNC FAILED FOR {failed.join(', ').toUpperCase()}</p>}
        </div>

        {mine && (
          <div className="panel flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 p-5">
            <h2 className="m-0 font-px text-xs text-cyan">YOUR RUN</h2>
            <div className="flex gap-1.5" role="img" aria-label={`${mine.solved} of ${mine.total} stages cleared`}>
              {mine.results.map((x) => (
                <span key={x.slug} className={cx('h-3.5 w-7', x.solvedAt ? 'bg-green' : 'border-2 border-line')} />
              ))}
            </div>
            <div>
              <span className="font-px text-[22px] text-yellow">{mine.points}</span>{' '}
              <span className="text-muted">/ {maxPts} pts this round</span>
            </div>
            <div className="text-sm text-muted">
              {status === 'upcoming' ? 'Warm up. Nothing counts yet.' : gap === 0 ? 'You hold the top spot. Defend it.' : `${gap} pts behind ${roundRows[0].name}.`}
            </div>
          </div>
        )}
      </section>

      <footer className="flex flex-wrap justify-between gap-2.5 font-px text-[10px] text-muted">
        <span>SCORES SYNC FROM CODEWARS EVERY 5 MIN</span>
        <span>
          {players.length} PLAYERS · {TAGLINE.toUpperCase()}
        </span>
      </footer>
    </Shell>
  );
}

function Hearts({ tier }: { tier: Tier }) {
  const n = { easy: 1, medium: 2, hard: 3 }[tier];
  return (
    <span role="img" aria-label={tier} className="flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <svg key={i} className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 21s-7-4.6-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.4-9.5 9-9.5 9z"
            fill={i < n ? 'var(--color-magenta)' : 'none'}
            stroke="var(--color-line)"
            strokeWidth={i < n ? 0 : 2}
          />
        </svg>
      ))}
    </span>
  );
}
