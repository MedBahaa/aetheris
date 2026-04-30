import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Support pour les scripts standalone
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client public (utilisable côté client avec @supabase/ssr pour harmoniser les cookies)
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);

// Client admin (utilisable uniquement côté serveur pour bypasser RLS si besoin)
export const supabaseAdmin = (typeof window === 'undefined' && serviceRoleKey) 
  ? createClient(supabaseUrl, serviceRoleKey) 
  : null as any;
