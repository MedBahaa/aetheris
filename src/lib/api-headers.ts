import { NextResponse } from 'next/server';

/**
 * CORS & Security Headers Utility
 * AUDIT FIX: Ajoute des headers CORS et sécurité aux réponses API.
 * 
 * Usage:
 *   return corsHeaders(NextResponse.json(data));
 *   return corsHeaders(NextResponse.json({ error }, { status: 500 }));
 */

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || '*';

export function corsHeaders(response: NextResponse): NextResponse {
  // CORS
  response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400'); // Cache preflight 24h
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

/**
 * Gère les requêtes OPTIONS (preflight CORS)
 */
export function handleOptionsRequest(): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return corsHeaders(response);
}
