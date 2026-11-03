import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function applySecurityHeaders(res: NextResponse, cspHeaderValue: string): NextResponse {
  res.headers.set('Content-Security-Policy', cspHeaderValue)
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  res.headers.set('X-DNS-Prefetch-Control', 'off')
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )
  res.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )
  return res
}

/**
 * PROXY (Next.js 16)
 * Remplace l'ancienne convention 'middleware'.
 * Gère le rafraîchissement des sessions @supabase/ssr (getAll/setAll),
 * la génération de nonce CSP par requête et le contrôle d'accès périphérique.
 */
export async function proxy(request: NextRequest) {
  const nonceBytes = new Uint8Array(16)
  crypto.getRandomValues(nonceBytes)
  const nonce = btoa(String.fromCharCode(...nonceBytes))
  const isDev = process.env.NODE_ENV === 'development'

  const cspHeaderValue = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''} https://js.stripe.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://*.supabase.co https://*.stripe.com;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://checkout.stripe.com;
    frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://checkout.stripe.com;
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeaderValue)

  let response = applySecurityHeaders(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    cspHeaderValue
  )

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = applySecurityHeaders(
            NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            }),
            cspHeaderValue
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  } catch (err) {
    console.error('[Proxy] Authentication check threw an exception:', err)
  }

  const pathname = request.nextUrl.pathname
  const isApiRoute = pathname.startsWith('/api/')
  const isServerAction = request.headers.has('next-action')

  // Routes publiques accessibles en navigation GET sans être connecté
  const publicRoutes = ['/', '/console', '/login', '/auth/callback', '/marche-live', '/offline']
  // Routes publiques explicitement autorisées à invoquer une Server Action sans session (analyse démo / auth)
  const publicServerActionRoutes = ['/console', '/login']
  const publicApiPrefixes = [
    '/api/market-live',
    '/api/market-index',
    '/api/macro',
    '/api/dividendes',
    '/api/companies/',
    '/api/cron/',
    '/api/market-cron',
    '/api/webhooks/stripe',
  ]
  const isPublicRoute =
    publicRoutes.includes(pathname) ||
    pathname.startsWith('/auth/') ||
    publicApiPrefixes.some((prefix) => pathname.startsWith(prefix))

  // 🔒 SÉCURITÉ : Bloquer l'invocation anonyme de Server Actions sur les routes publiques qui n'en exposent pas
  if (!user && isServerAction && !publicServerActionRoutes.includes(pathname)) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required for this action' },
        { status: 401 }
      ),
      cspHeaderValue
    )
  }

  // Si l'utilisateur n'est pas connecté et tente d'accéder à une page ou API protégée
  if (!user && !isPublicRoute) {
    if (isApiRoute || isServerAction) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: 'Unauthorized', message: 'Session expired or invalid' },
          { status: 401 }
        ),
        cspHeaderValue
      )
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return applySecurityHeaders(NextResponse.redirect(url), cspHeaderValue)
  }

  // Redirection vers / si authentifié et qu'il visite /login
  if (user && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return applySecurityHeaders(NextResponse.redirect(url), cspHeaderValue)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths (including /api/) except for static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
