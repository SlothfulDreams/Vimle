
import devServer from "@hono/vite-dev-server";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
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
  ],

build: {
  rollupOptions: {
    external: [
      "@prisma/client",
      ".prisma/client",
      "../lib/generated/prisma",
      "../lib/generated/prisma/client",
      "../lib/generated/prisma/internal"
    ],
  },
},
ssr: {
  external: [
    "@prisma/client",
    ".prisma/client",
    "../lib/generated/prisma",
    "../lib/generated/prisma/client",
    "../lib/generated/prisma/internal"
  ],
  noExternal: [],
},


  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
});
