import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import dotenv from 'dotenv';
import path from 'path';

if (typeof window !== 'undefined') {
  throw new Error('SECURITY VIOLATION: supabase-server ne doit jamais être importé dans un composant client.');
}

// Support pour les scripts standalone côté serveur / CLI
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Client Admin serveur (utilise SUPABASE_SERVICE_ROLE_KEY pour bypasser RLS de manière contrôlée)
 */
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : (null as any);

/**
 * Création d'un client Supabase pour le serveur (Server Components / Actions)
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Géré par le proxy de rafraîchissement des sessions
        }
      },
    },
  });
}
