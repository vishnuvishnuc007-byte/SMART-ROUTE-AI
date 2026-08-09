import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/home';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch { /* ignore */ }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase
          .from('profiles').select('id').eq('id', user.id).single();
        if (!existing) {
          const isAdmin = user.email === 'admin2008@gmail.com';
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: isAdmin ? 'Administrator' : (user.user_metadata.full_name || user.user_metadata.name || ''),
            avatar_url: user.user_metadata.avatar_url || '',
            role: isAdmin ? 'admin' : (user.user_metadata.role || 'user'),
          });
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
