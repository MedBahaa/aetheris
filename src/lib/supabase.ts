import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Support pour les scripts standalone (exécuté uniquement côté Node.js, jamais dans le navigateur)
if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  } catch {
    // Ignoré côté navigateur / Edge runtime
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = typeof window === 'undefined' ? (process.env.SUPABASE_SERVICE_ROLE_KEY || '') : '';

// Client public (utilisable côté client avec @supabase/ssr pour harmoniser les cookies)
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);

// Client admin (utilisable uniquement côté serveur / scripts standalone pour bypasser RLS)
export const supabaseAdmin = (typeof window === 'undefined' && serviceRoleKey) 
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) 
  : null as any;
