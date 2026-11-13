import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AgroGestor',
    short_name: 'AgroGestor',
    description: 'Feed, amigos, fazendas e convites para jogar Farming Simulator.',
    start_url: '/feed',
    display: 'standalone',
    background_color: '#eef2eb',
    theme_color: '#12301f',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
