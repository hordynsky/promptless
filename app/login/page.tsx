import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { APP_NAME, TAGLINE, findPlayer } from '@/data/league';
import { clanCode, verifyPending } from '@/lib/auth';
import { login, verify } from '../actions';

export default function Page(props: PageProps<'/login'>) {
  return (
    <Suspense fallback={null}>
      <Login searchParams={props.searchParams} />
    </Suspense>
  );
}

const field = 'border-[3px] border-line bg-ink px-4 py-3 font-body text-base text-text outline-none focus:border-cyan';
const errText = 'font-px text-[10px] text-magenta';

async function Login({ searchParams }: { searchParams: PageProps<'/login'>['searchParams'] }) {
  await connection(); // clanCode() depends on today's date
  const [{ u, err }, jar] = await Promise.all([searchParams, cookies()]);
  const player = typeof u === 'string' ? findPlayer(u) : undefined;
  const verified = !!player && verifyPending(jar.get('pending')?.value) === player.codewars;

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col gap-8 px-6 py-16">
      <div className="text-center">
        <h1 className="m-0 font-px text-[22px] text-cyan [text-shadow:4px_4px_0_var(--color-magenta)] sm:text-[28px]">{APP_NAME}</h1>
        <p className="mt-4 font-px text-[10px] text-muted">{TAGLINE.toUpperCase()}</p>
      </div>

      <div className="panel flex flex-col gap-5 p-7">
        {player && verified ? (
          <form action={verify} className="flex flex-col gap-4">
            <input type="hidden" name="username" value={player.codewars} />
            <p className="font-px text-[10px] text-yellow">HI {player.name.toUpperCase()}. PROVE THE ACCOUNT IS YOURS:</p>
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              <li>
                Open{' '}
                <a href="https://www.codewars.com/users/edit" target="_blank" rel="noreferrer" className="text-cyan underline">
                  codewars.com/users/edit
                </a>
              </li>
              <li>
                Set <strong>Clan</strong> to <code className="font-px text-[12px] text-green">{clanCode(player.codewars)}</code> and save
              </li>
              <li>Come back here and press VERIFY</li>
            </ol>
            <p className="text-sm text-muted">The code is valid today. Afterwards set your clan to anything you like.</p>
            {err === 'clan' && <p className={errText}>CLAN DOES NOT MATCH YET. SAVE ON CODEWARS, WAIT A MINUTE, RETRY.</p>}
            {err === 'api' && <p className={errText}>COULD NOT LOAD YOUR CODEWARS PROFILE. TRY AGAIN IN A MINUTE.</p>}
            <div className="flex flex-wrap gap-3">
              <button className="pbtn">VERIFY ▶</button>
              <a href="/login" className="pbtn pbtn-off">
                BACK
              </a>
            </div>
          </form>
        ) : (
          <form action={login} className="flex flex-col gap-4">
            <label htmlFor="username" className="font-px text-[10px] text-yellow">
              PLAYER 1 · CODEWARS USERNAME
            </label>
            <input
              id="username"
              name="username"
              required
              autoComplete="username"
              defaultValue={player?.codewars ?? ''}
              placeholder="your codewars username"
              className={field}
            />
            <label htmlFor="password" className="font-px text-[10px] text-yellow">
              LEAGUE PASSWORD
            </label>
            <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="shared league key" className={field} />
            {err === 'invite' && <p className={errText}>NOT ON THE GUEST LIST. ASK THE ADMIN TO ADD YOU.</p>}
            {err === 'pw' && <p className={errText}>WRONG PASSWORD. ASK THE ADMIN FOR THE LEAGUE KEY.</p>}
            {err === 'expired' && <p className={errText}>THAT TOOK TOO LONG. ENTER THE PASSWORD AGAIN.</p>}
            <button className="pbtn self-start">CONTINUE ▶</button>
          </form>
        )}
      </div>

      <p className="text-center text-sm text-muted">
        Rules: solve on Codewars in JS or TS during the round. Only first completions count, so never solve a stage before kick-off.
      </p>
    </main>
  );
}
