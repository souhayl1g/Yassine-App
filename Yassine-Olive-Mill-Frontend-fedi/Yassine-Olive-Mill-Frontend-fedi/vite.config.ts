import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
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
    server: serverConfig,
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
