/**
 * Résout de manière sûre l'origine canonique de l'application (anti Open Redirect)
 * pour les redirections Stripe Checkout et callbacks en environnement Vercel / local.
 */
export function resolveAppOrigin(clientOrigin?: string): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, '');
  }

  const vercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProdUrl) {
    return `https://${vercelProdUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  }

  const vercelPreviewUrl = process.env.VERCEL_URL?.trim();
  if (vercelPreviewUrl) {
    return `https://${vercelPreviewUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  }

  if (
    clientOrigin &&
    process.env.NODE_ENV !== 'production' &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clientOrigin)
  ) {
    return clientOrigin;
  }

  return 'http://localhost:3000';
}
