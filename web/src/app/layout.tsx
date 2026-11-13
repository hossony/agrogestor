import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'AgroGestor', template: '%s · AgroGestor' },
  description: 'A comunidade dos fazendeiros do Farming Simulator: feed, amigos, fazendas e convites para jogar.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'AgroGestor', statusBarStyle: 'black-translucent' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef2eb' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1611' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
