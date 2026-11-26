import type { MetadataRoute } from 'next';
import { STUDIO_PROFILE } from '@/lib/publicStorefront';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/login',
    name: `${STUDIO_PROFILE.name} — Studio App`,
    short_name: STUDIO_PROFILE.name,
    description: STUDIO_PROFILE.description,
    start_url: '/login',
    scope: '/',
    display: 'standalone',
    background_color: '#F9F8F5',
    theme_color: '#8B6A21',
    icons: [
      {
        src: '/brand/wedding-photoart-logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
