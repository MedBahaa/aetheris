import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client public strictement réservé au navigateur (utilise @supabase/ssr pour synchroniser les cookies)
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
