import type { NextConfig } from 'next';

const config: NextConfig = {
  // O app de gestão (exportado pelo Expo) fica em public/gestao.
  async rewrites() {
    return [{ source: '/gestao', destination: '/gestao/index.html' }];
  },
  async headers() {
    // O app do Windows chama a API de outra origem, com token (sem cookie).
    const cors = [
      { key: 'Access-Control-Allow-Origin', value: '*' },
      { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'authorization, content-type' },
    ];
    return [
      { source: '/api/saves/:path*', headers: cors },
      { source: '/api/auth/:path*', headers: cors },
      { source: '/api/me', headers: cors },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] },
    ];
  },
};

export default config;
