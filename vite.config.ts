import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'cloudflare-rocket-loader-bypass',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          return html.replace(
            '<script type="module"',
            '<script data-cfasync="false" type="module"',
          );
        },
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8081,
  },
});
