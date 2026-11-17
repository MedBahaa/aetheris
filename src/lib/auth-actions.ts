'use server';

import { headers, cookies } from 'next/headers';
import { z } from 'zod';
import { createServerSupabase } from './supabase-server';
import { checkRateLimitAsync, getClientIpFromHeaders } from './rate-limiter';

const EmailSchema = z.string().trim().toLowerCase().email('Adresse email invalide.').max(160);

const StrongPasswordSchema = z
  .string()
  .min(10, 'Minimum 10 caractères requis.')
  .max(128, 'Mot de passe trop long.')
  .refine((pwd) => /[A-Z]/.test(pwd), 'Au moins une lettre majuscule requise.')
  .refine((pwd) => /[a-z]/.test(pwd), 'Au moins une lettre minuscule requise.')
  .refine(
    (pwd) => /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
    'Au moins un chiffre ou un caractère spécial requis.'
  );

/**
 * Authentification côté serveur avec protection anti-bruteforce (par IP et par compte email)
 */
export async function signInWithRateLimitAction(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const parsedEmail = EmailSchema.safeParse(email);
  if (!parsedEmail.success || !password || password.length > 128) {
    return { success: false, error: 'IDENTIFIANTS INVALIDES. VÉRIFIEZ VOTRE EMAIL ET MOT DE PASSE.' };
  }

  const reqHeaders = await headers();
  const clientIp = getClientIpFromHeaders(reqHeaders);
  const cleanEmail = parsedEmail.data;

  // Verrouillage progressif anti-credential-stuffing : 8 tentatives / 5 min par IP et 6 / 5 min par compte
  const ipLimit = await checkRateLimitAsync(`auth:login:ip:${clientIp}`, 8, 5 * 60_000);
  const emailLimit = await checkRateLimitAsync(`auth:login:email:${cleanEmail}`, 6, 5 * 60_000);

  if (!ipLimit.allowed || !emailLimit.allowed) {
    return {
      success: false,
      error: 'TROP DE TENTATIVES DE CONNEXION. COMPTE TEMPORAIREMENT PROTÉGÉ (RÉESSAYEZ DANS 5 MINUTES).',
    };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error || !data?.session) {
    const rawMsg = error?.message || '';
    if (rawMsg.includes('Email not confirmed')) {
      return { success: false, error: 'EMAIL NON CONFIRMÉ. VÉRIFIEZ VOTRE BOÎTE MAIL DE VALIDATION.' };
    }
    return { success: false, error: 'IDENTIFIANTS INVALIDES. VÉRIFIEZ VOTRE EMAIL ET MOT DE PASSE.' };
  }

  return { success: true };
}

/**
 * Inscription côté serveur avec politique NIST/OWASP obligatoire et rate-limiting anti-bots
 */
export async function signUpWithPolicyAction(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const parsedEmail = EmailSchema.safeParse(email);
  if (!parsedEmail.success) {
    return { success: false, error: 'ADRESSE EMAIL INVALIDE.' };
  }

  const parsedPwd = StrongPasswordSchema.safeParse(password);
  if (!parsedPwd.success) {
    return {
      success: false,
      error:
        'MOT DE PASSE TROP FAIBLE : Minimum 10 caractères incluant majuscule, minuscule et chiffre ou symbole.',
    };
  }

  const reqHeaders = await headers();
  const clientIp = getClientIpFromHeaders(reqHeaders);

  const ipLimit = await checkRateLimitAsync(`auth:signup:ip:${clientIp}`, 4, 15 * 60_000);
  if (!ipLimit.allowed) {
    return {
      success: false,
      error: "TROP DE DEMANDES D'INSCRIPTION DEPUIS CETTE ADRESSE. VEUILLEZ PATIENTER 15 MINUTES.",
    };
  }

  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    `${reqHeaders.get('x-forwarded-proto') || 'http'}://${reqHeaders.get('host') || 'localhost:3000'}`;

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signUp({
    email: parsedEmail.data,
    password: parsedPwd.data,
    options: {
      emailRedirectTo: `${appOrigin}/auth/callback`,
    },
  });

  if (error) {
    const rawMsg = error.message || '';
    if (rawMsg.toLowerCase().includes('already registered')) {
      return { success: false, error: 'CE COMPTE EXISTE DÉJÀ. VEUILLEZ VOUS CONNECTER.' };
    }
    return { success: false, error: "ÉCHEC DE L'INSCRIPTION. VÉRIFIEZ VOS INFORMATIONS OU RÉESSAYEZ PLUS TARD." };
  }

  return { success: true };
}

/**
 * Déconnexion côté serveur : invalide la session Supabase ET purge tous les cookies `sb-*` côté serveur
 * afin d'éviter toute session fantôme ou boucle de redirection dans le proxy.
 */
export async function signOutAction(): Promise<{ success: boolean }> {
  try {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  } catch {
    // Continuer vers la purge explicite des cookies même si l'appel réseau échoue
  }

  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    for (const c of allCookies) {
      if (c.name.startsWith('sb-')) {
        cookieStore.delete(c.name);
      }
    }
  } catch {
    // Ignorer si les en-têtes sont déjà envoyés
  }

  return { success: true };
}
