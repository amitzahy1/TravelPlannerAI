import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // IMPORTANT: Relative base path ensures assets load from any folder
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          // Hash routing: no navigation fallback needed. Must be null (not just absent)
          // to suppress VitePWA's auto-generated NavigationRoute which throws
          // non-precached-url with base './' and blocks SW activation.
          navigateFallback: null,
          // Never precache HTML — always fetch fresh from network so deploys
          // take effect immediately without stale index.html breaking the update cycle.
          globIgnores: ['**/*.html'],
        },
        manifest: {
          name: 'Travel Planner Pro',
          short_name: 'TravelPro',
          description: 'AI-Powered Travel Itinerary Planner',
          theme_color: '#2563eb',
          background_color: '#f7f9fc',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'he',
          dir: 'rtl',
          start_url: '.',
          scope: '.',
          // Icons: Android needs ≥ 192px + 512px PNGs in /public for the
          // install prompt to fire. TODO: generate + add `public/icon-192.png`
          // and `public/icon-512.png` from the plane-gradient logo. Until
          // then the prompt will silently fail on Chrome Android.
          icons: []
        }
      })
    ],
    // Vite automatically exposes VITE_* prefixed env vars to import.meta.env
    // No need for define block - keeping it minimal
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
