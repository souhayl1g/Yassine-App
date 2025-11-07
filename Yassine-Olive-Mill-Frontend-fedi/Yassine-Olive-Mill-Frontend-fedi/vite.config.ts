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

  // === LIFETIME SOLUTION: Cache-Busting Version ===
  // Increment this version to force complete PWA cache invalidation
  const PWA_VERSION = "2.1.0";

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
    
    // === CRITICAL: Force cache busting for all assets ===
    build: {
      // Ensure every build generates unique filenames
      rollupOptions: {
        output: {
          // Add content hash to all JS/CSS files (e.g., index-abc123.js)
          entryFileNames: `assets/[name]-[hash].js`,
          chunkFileNames: `assets/[name]-[hash].js`,
          assetFileNames: `assets/[name]-[hash].[ext]`,
          // Prevent service worker from caching stale assets
          manualChunks: {
            'print-component': ['react-to-print', 'qrcode.react'],
          },
        },
      },
      // Enable sourcemaps for debugging
      sourcemap: mode === "development",
      // Ensure CSS is extracted with hash
      cssCodeSplit: true,
    },
    
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      
      VitePWA({
        registerType: "autoUpdate",
        // === FORCE IMMEDIATE UPDATES ===
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true,        // Install new SW immediately
          clientsClaim: true,       // Take control of all clients immediately
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          
          // === CRITICAL: Short cache for JS files ===
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'script',
              handler: "NetworkFirst",
              options: {
                cacheName: "js-cache-v2", // Change name to clear old caches
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 1, // 1 hour max cache
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
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
                  maxAgeSeconds: 60 * 60 * 24 * 365,
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
              },
            },
          ],
        },
        
        manifest: {
          name: "معصرة الحاج لطفي - نظام الإدارة",
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
              src: "/favicon.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any",
            },
            {
              src: "/favicon.svg",
              sizes: "192x192",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
          shortcuts: [
            {
              name: "إضافة عميل جديد",
              short_name: "عميل جديد",
              url: "/clients",
              icons: [{ src: "/favicon.svg", sizes: "96x96" }],
            },
            {
              name: "عمل اليوم",
              short_name: "اليوم",
              url: "/",
              icons: [{ src: "/favicon.svg", sizes: "96x96" }],
            },
          ],
          categories: ["business", "productivity"],
          lang: "ar",
          dir: "rtl",
        },
        
        // === DEVELOPMENT SETTINGS ===
        devOptions: {
          enabled: false, // Disable in dev to avoid SW issues
        },
        
        // === FORCE UPDATE ON EVERY DEPLOYMENT ===
        includeAssets: [
          "favicon.ico",
          "favicon.png",
          "favicon.svg",
          "apple-touch-icon.png",
          "olive_mill.ico",
          "olive_mill.svg",
        ],
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
    },
    
    // === DEVELOPMENT MODE SETTINGS ===
    define: {
      __PWA_VERSION__: JSON.stringify(PWA_VERSION),
    },
  };
});