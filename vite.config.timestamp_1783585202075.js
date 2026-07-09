// vite.config.ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
var vite_config_default = defineConfig({
  tanstackStart: {
    server: { entry: "server" }
  },
  // INYECTAMOS CONFIGURACIÓN ADICIONAL DE VITE PARA EVITAR BLOQUEOS EN EL DESPLIEGUE
  vite: {
    build: {
      chunkSizeWarningLimit: 2e3,
      // Elevamos el límite para que las advertencias no congelen Vercel/Cloudflare
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("lucide-react")) return "vendor-icons";
              if (id.includes("recharts")) return "vendor-charts";
              if (id.includes("@supabase")) return "vendor-supabase";
              return "vendor-libs";
            }
          }
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
