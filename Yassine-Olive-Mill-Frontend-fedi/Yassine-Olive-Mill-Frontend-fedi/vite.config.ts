import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const serverConfig: any = {
    host: "::",
    port: 5173,
  };

  // Add HTTPS for development if certificates exist
  if (mode === "development") {
    const keyExists = fs.existsSync('./certs/key.pem');
    const certExists = fs.existsSync('./certs/cert.pem');
    
    if (keyExists && certExists) {
      serverConfig.https = {
        key: fs.readFileSync('./certs/key.pem'),
        cert: fs.readFileSync('./certs/cert.pem'),
      };
    }
  }

  return {
    server: {
      ...serverConfig,
      proxy: {
        // Proxy API calls to local backend in development so we can use `/api` everywhere
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.ico",
          "favicon.png",
          "favicon.svg",
          "apple-touch-icon.png",
          "olive_mill.ico",
          "olive_mill.svg",
        ],
        manifest: {
          name: "معصرة ياسين وأبوه - نظام الإدارة",
          short_name: "معصرة ياسين",
          description: "نظام شامل لإدارة معاصر الزيتون مع دعم اللغة العربية",
          theme_color: "#22C55E",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait-primary",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "/favicon.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable",
            },
            {
              src: "/apple-touch-icon.png",
              sizes: "180x180",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/favicon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any",
            },
          ],
          shortcuts: [
            {
              name: "إضافة عميل جديد",
              short_name: "عميل جديد",
              description: "إضافة عميل جديد بسرعة",
              url: "/clients",
              icons: [{ src: "/favicon.png", sizes: "96x96" }],
            },
            {
              name: "عمل اليوم",
              short_name: "اليوم",
              description: "عرض عمل اليوم",
              url: "/",
              icons: [{ src: "/favicon.png", sizes: "96x96" }],
            },
          ],
          categories: ["business", "productivity"],
          lang: "ar",
          dir: "rtl",
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60, // 1 hour
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false, // Disable in dev to avoid service worker issues during development
        },
      }),
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
