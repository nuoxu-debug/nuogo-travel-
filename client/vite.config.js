import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  cacheDir: process.env.VITE_CACHE_DIR || "node_modules/.vite",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787"
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./tests/setup.js",
    css: true
  }
});
