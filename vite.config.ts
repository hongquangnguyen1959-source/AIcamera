import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'suppress-hmr-client-error',
        transformIndexHtml: {
          order: 'pre',
          handler() {
            return [
              {
                tag: 'script',
                attrs: { type: 'text/javascript' },
                injectTo: 'head-prepend',
                children: `
                  (function() {
                    if (typeof window === 'undefined') return;
                    try {
                      if (window.CloseEvent) {
                        Object.defineProperty(window.CloseEvent.prototype, 'wasClean', {
                          get: function() { return true; },
                          configurable: true,
                        });
                      }
                    } catch(e) {}
                    var origErr = console.error;
                    console.error = function() {
                      if (arguments.length > 0) {
                        var msg = String((arguments[0] && (arguments[0].message || arguments[0].stack || arguments[0])) || '');
                        if (msg.indexOf('WebSocket') !== -1) return;
                      }
                      return origErr.apply(console, arguments);
                    };
                  })();
                `,
              },
            ];
          },
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'Dịch Camera Trực Tiếp - AR Translator',
          short_name: 'Dịch Camera',
          description: 'Ứng dụng dịch ngôn ngữ trực tiếp qua camera sang tiếng Việt tức thì.',
          theme_color: '#022c22',
          background_color: '#022c22',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
