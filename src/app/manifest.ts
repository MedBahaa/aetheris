import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aetheris AI | Analyste Financier Stratégique',
    short_name: 'Aetheris',
    description: 'Agent IA multi-agents pour la veille stratégique et l\'analyse boursière de la Bourse de Casablanca.',
    start_url: '/marche-live',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    background_color: '#020408',
    theme_color: '#020408',
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
        name: 'Marché Live',
        short_name: 'Marché',
        description: 'Cotations en temps réel de la BVC',
        url: '/marche-live',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Console Alpha',
        short_name: 'Analyser',
        description: 'Lancer une analyse multi-agents IA',
        url: '/console',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Palmarès Dividendes',
        short_name: 'Dividendes',
        description: 'Classement des rendements BVC',
        url: '/dividendes',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Purification AAOIFI',
        short_name: 'Sharia',
        description: 'Calculateur de purification & conformité',
        url: '/purification',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Mon Portefeuille',
        short_name: 'Portefeuille',
        description: 'Voir et gérer mon portefeuille',
        url: '/portfolio',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
