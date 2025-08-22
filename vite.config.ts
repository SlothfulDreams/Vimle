import vercel from "vite-plugin-vercel";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import devServer from "@hono/vite-dev-server";
import { defineConfig } from "vite";
import vike from "vike/plugin";

export default defineConfig({
  define: {
    global: "globalThis",
  },

  // Enable sourcemaps in development for better debugging
  css: {
    devSourcemap: true,
  },

  esbuild: {
    // Preserve sourcemap information for client directives
    sourcemap: true,
  },

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

    // Custom plugin to suppress known Tailwind sourcemap warnings
    {
      name: "suppress-tailwind-sourcemap-warnings",
      apply: "build",
      configResolved(config) {
        const originalOnWarn = config.build.rollupOptions.onwarn;
        config.build.rollupOptions.onwarn = (warning, warn) => {
          // Suppress sourcemap warnings from @tailwindcss/vite plugin
          if (
            warning.code === "SOURCEMAP_BROKEN" &&
            warning.plugin === "@tailwindcss/vite:generate:build"
          ) {
            return;
          }

          // Suppress CSS sourcemap warnings
          if (
            warning.code === "SOURCEMAP_BROKEN" &&
            warning.plugin === "vite:css"
          ) {
            return;
          }

          // Call original onwarn if it exists, otherwise use default warn
          if (originalOnWarn) {
            originalOnWarn(warning, warn);
          } else {
            warn(warning);
          }
        };
      },
    },
  ],

  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split vendor dependencies
          if (id.includes("react") || id.includes("react-dom")) {
            return "vendor-react";
          }
          if (
            id.includes("@uiw/react-codemirror") ||
            id.includes("@replit/codemirror-vim") ||
            id.includes("@codemirror/lang-javascript") ||
            id.includes("@codemirror/theme-one-dark") ||
            id.includes("@codemirror/view")
          ) {
            return "vendor-codemirror";
          }
          if (
            id.includes("@radix-ui/react-dialog") ||
            id.includes("@radix-ui/react-dropdown-menu") ||
            id.includes("@radix-ui/react-avatar") ||
            id.includes("@radix-ui/react-progress") ||
            id.includes("@radix-ui/react-separator")
          ) {
            return "vendor-ui";
          }
          if (
            id.includes("@trpc/client") ||
            id.includes("@trpc/react-query") ||
            id.includes("@tanstack/react-query")
          ) {
            return "vendor-trpc";
          }
          // Default behavior for other modules
          return undefined;
        },
      },
    },
  },

  optimizeDeps: {
    exclude: ["prisma", "@prisma/client"],
  },

  ssr: {
    target: "node",
  },

  // Vercel configuration - let Vike handle server entry generation
  vercel: {
    additionalEndpoints: [
      {
        // entry file to the server. Default export must be a node server or a function
        source: "hono-entry.ts",
        // replaces default Vike target
        destination: "ssr_",
        // already added by default Vike route
        route: false,
      },
    ],
  },

  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
      ".prisma/client": new URL("./lib/generated/prisma", import.meta.url)
        .pathname,
    },
  },
});
