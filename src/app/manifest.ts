import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aetheris AI | Stratégie',
    short_name: 'Aetheris',
    description: 'Agent IA spécialisé dans la veille stratégique et l\'analyse boursière.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020408',
    theme_color: '#020408',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      }
    ],
    orientation: 'any',
  };
}
