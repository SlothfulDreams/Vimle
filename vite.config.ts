import vercel from "@vite-plugin-vercel/vike";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import devServer from "@hono/vite-dev-server";
import vike from "vike/plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    vike(),
    devServer({
      entry: "hono-entry.ts",

      exclude: [
        /^\/@.+$/,
        /.*\.(ts|tsx|vue)($|\?)/,
        /.*\.(s?css|less)($|\?)/,
        /^\/favicon\.ico$/,
        /.*\.(svg|png)($|\?)/,
        /^\/(public|assets|static)\/.+/,
        /^\/node_modules\/.*/,
      ],

      injectClientScript: false,
    }),
    react(),
    tailwindcss(),
    vercel(),
  ],

  build: {
    target: "es2022",
  },

  vercel: {
    additionalEndpoints: [
      {
        source: "hono-entry.ts",
        destination: "ssr_",
        route: false,
      },
    ],
  },

  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
});
