import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const rawNext = searchParams.get('next') ?? '/portfolio';

  // 🔒 SÉCURITÉ : Empêcher les attaques Open Redirect (ex: ?next=//evil.com ou ?next=https://evil.com)
  const safeNext =
    rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\') && !rawNext.startsWith('/login')
      ? rawNext
      : '/portfolio';

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  } else if (tokenHash && type) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // Return the user to login page with clear error indicator
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
