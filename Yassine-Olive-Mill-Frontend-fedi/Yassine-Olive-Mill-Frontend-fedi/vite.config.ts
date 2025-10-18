// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const serverConfig: any = {
    host: "::",
    port: 5173,
  };

  // Add HTTPS for development if certificates exist
  if (mode === "development") {
    // Look for mkcert-generated certificates
    const keyPath = './certs/localhost+2-key.pem';
    const certPath = './certs/localhost+2.pem';
    
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      serverConfig.https = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      console.log('✅ HTTPS enabled with mkcert certificates');
    } else {
      console.log('⚠️  No certificates found. Run: mkcert -key-file ./certs/localhost+2-key.pem -cert-file ./certs/localhost+2.pem localhost 127.0.0.1 ::1 YOUR_LOCAL_IP');
    }
  }

  return {
    server: serverConfig,
    plugins: [
      react(),
      VitePWA({
        injectRegister: 'auto',
        registerType: 'autoUpdate',
        manifest: {
          name: 'Yassine Olive Mill',
          short_name: 'OliveMill',
          description: 'Olive Mill Workflow App',
          start_url: '.',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#4CAF50',
          icons: [
            { src: '/olive_mill.png', sizes: '192x192', type: 'image/png' },
            { src: '/olive_mill.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,json,woff,woff2}'],
          runtimeCaching: [
            // Cache GET API calls: try network first, fallback to cache when offline
            {
              urlPattern: /\/api\/.*$/i,
              handler: 'NetworkFirst',
              method: 'GET',
              options: {
                cacheName: 'api-get-cache',
                networkTimeoutSeconds: 10,
                cacheableResponse: { statuses: [0, 200] },
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60, // 1 hour
                },
              },
            },
            // Queue mutations while offline and replay when back online
            {
              urlPattern: /\/api\/.*$/i,
              handler: 'NetworkOnly',
              method: 'POST',
              options: {
                backgroundSync: {
                  name: 'api-write-queue',
                  options: { maxRetentionTime: 24 * 60 }, // minutes
                },
              },
            },
            {
              urlPattern: /\/api\/.*$/i,
              handler: 'NetworkOnly',
              method: 'PUT',
              options: {
                backgroundSync: {
                  name: 'api-write-queue',
                  options: { maxRetentionTime: 24 * 60 },
                },
              },
            },
            {
              urlPattern: /\/api\/.*$/i,
              handler: 'NetworkOnly',
              method: 'DELETE',
              options: {
                backgroundSync: {
                  name: 'api-write-queue',
                  options: { maxRetentionTime: 24 * 60 },
                },
              },
            },
            // Static assets
            {
              urlPattern: /.*\.(?:png|jpg|jpeg|svg|ico|css|js|woff2?)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-assets',
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
        },
      }),
      ...(mode === 'development' ? [componentTagger()] : []),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      exclude: ['qr-scanner']
    },
    worker: {
      format: 'es'
    }
  };
});