import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // The "artifact" mode builds a relocatable bundle with fixed file names for hosting.
  ...(mode === "artifact" && {
    base: "./",
    build: {
      outDir: "dist-artifact",
      rollupOptions: {
        output: {
          entryFileNames: "assets/app.js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/app[extname]",
        },
      },
    },
  }),
}));
