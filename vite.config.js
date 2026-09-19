import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Local-dev-only convenience: lets `vite` alone (no `netlify dev`
      // wrapper) reach the Netlify functions when a `netlify functions:serve`
      // / `netlify dev` process happens to be running on 8888 alongside it.
      // Has no effect, and no cost, when nothing is listening on 8888.
      "/.netlify/functions": { target: "http://localhost:8888", changeOrigin: true },
    },
  },
});
