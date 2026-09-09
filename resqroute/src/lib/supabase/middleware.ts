import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url, options) => {
          return fetch(url, { ...options, signal: AbortSignal.timeout(2000) });
        },
      },
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;

    if (
      !user &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/auth') &&
      request.nextUrl.pathname !== '/'
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
      const role = profile?.role || 'user';

      if (request.nextUrl.pathname.startsWith('/admin') && role !== 'admin') {
        return NextResponse.redirect(new URL('/home', request.url));
      }
      if (request.nextUrl.pathname.startsWith('/help-team') && role !== 'help_team' && role !== 'admin') {
        return NextResponse.redirect(new URL('/home', request.url));
      }
    }
  } catch (err) {
    console.error('Middleware Supabase session update error:', err);
  }

  return supabaseResponse;
}
