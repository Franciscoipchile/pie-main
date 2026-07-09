// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // FORZAMOS EL CAMBIO DE ENTORNO EN LAS OPCIONES DE VITE
  vite: {
    // Esto le avisa a Vinxi/Nitro (los motores que usa TanStack Start) que el destino es Vercel
    // y desactiva los bloqueos de Cloudflare.
    // Si prefieres Netlify, cambia "vercel" por "netlify"
    define: {
      "process.env.NITRO_PRESET": JSON.stringify("vercel"),
    },
    build: {
      chunkSizeWarningLimit: 2000, // Elevamos el límite para que las advertencias no congelen Vercel/Cloudflare
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("lucide-react")) return "vendor-icons";
              if (id.includes("recharts")) return "vendor-charts";
              if (id.includes("@supabase")) return "vendor-supabase";
              return "vendor-libs"; // Divide el resto de librerías pesadas de tu código
            }
          },
        },
      },
    },
  },
});