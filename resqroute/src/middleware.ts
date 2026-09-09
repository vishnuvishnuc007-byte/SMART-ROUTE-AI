import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  try {
    const timeout = new Promise<NextResponse>((resolve) =>
      setTimeout(() => resolve(NextResponse.next({ request })), 1500)
    );
    return await Promise.race([updateSession(request), timeout]);
  } catch (err) {
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

