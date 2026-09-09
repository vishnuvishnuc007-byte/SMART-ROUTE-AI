import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function RootPage() {
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (error) {
    console.error('Supabase auth error in RootPage:', error);
  }

  redirect(user ? '/home' : '/login');
}

