import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  } catch {
    // Ignorer si la session est déjà expirée côté Supabase
  }

  const response = NextResponse.json({ success: true });

  // Supprimer explicitement tous les cookies d'authentification Supabase (sb-*)
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.delete(cookie.name);
      response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' });
    }
  }

  return response;
}
