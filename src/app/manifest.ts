import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aetheris AI | Analyste Financier Stratégique',
    short_name: 'Aetheris',
    description: 'Agent IA multi-agents pour la veille stratégique et l\'analyse boursière de la Bourse de Casablanca.',
    start_url: '/intelligence',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    background_color: '#030712',
    theme_color: '#0d1117',
    orientation: 'portrait-primary',
    lang: 'fr-MA',
    dir: 'ltr',
    scope: '/',
    categories: ['finance', 'business', 'productivity'],
    screenshots: [],
    prefer_related_applications: false,
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Analyser une action',
        short_name: 'Analyser',
        description: 'Lancer une analyse IA instantanée',
        url: '/intelligence',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Mon Portefeuille',
        short_name: 'Portefeuille',
        description: 'Voir et gérer mon portefeuille',
        url: '/portfolio',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Marché Live',
        short_name: 'Marché',
        description: 'Cotations en temps réel de la BVC',
        url: '/marche-live',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
