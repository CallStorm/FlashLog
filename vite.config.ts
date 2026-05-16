import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { ClientRequest, IncomingMessage } from 'http';
import path from 'path';

const VOLC_ASR_AUTH_QUERY_KEYS = [
  'X-Api-Key',
  'X-Api-Resource-Id',
  'X-Api-Request-Id',
  'X-Api-Sequence',
] as const;

function applyVolcAsrAuthHeadersFromQuery(
  proxyReq: ClientRequest,
  req: IncomingMessage,
): void {
  const url = new URL(req.url ?? '/', 'http://localhost');
  for (const key of VOLC_ASR_AUTH_QUERY_KEYS) {
    const value = url.searchParams.get(key);
    if (value) proxyReq.setHeader(key, value);
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/openspeech': {
        target: 'https://openspeech.bytedance.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/openspeech/, ''),
      },
      '/api/openspeech-ws': {
        target: 'wss://openspeech.bytedance.com',
        ws: true,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/openspeech-ws/, ''),
        configure: (proxy) => {
          proxy.on('proxyReqWs', (proxyReq, req) => {
            applyVolcAsrAuthHeadersFromQuery(proxyReq, req);
          });
        },
      },
    },
  },
});
