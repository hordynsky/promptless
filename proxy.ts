import { NextResponse, type NextRequest } from 'next/server';
import { findPlayer } from '@/data/league';
import { verifySession } from '@/lib/auth';

// Gate every page except /login behind a valid session for a player still on the allowlist. Pages re-check too.
export function proxy(request: NextRequest) {
  const me = verifySession(request.cookies.get('session')?.value);
  if (me && findPlayer(me)) return NextResponse.next();
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!login|_next|favicon.ico).*)'],
};
