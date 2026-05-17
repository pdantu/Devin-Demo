import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/sessions": { target: "http://localhost:8000", changeOrigin: true },
      "/simulate": { target: "http://localhost:8000", changeOrigin: true },
      "/issues": { target: "http://localhost:8000", changeOrigin: true },
      "/metrics": { target: "http://localhost:8000", changeOrigin: true },
      "/health": { target: "http://localhost:8000", changeOrigin: true },
      "/schedule": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
