import type { NextConfig } from 'next';

const config: NextConfig = {
  // O app de gestão (exportado pelo Expo) fica em public/gestao.
  async rewrites() {
    return [{ source: '/gestao', destination: '/gestao/index.html' }];
  },
  async headers() {
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] }];
  },
};

export default config;
