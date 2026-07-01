import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    strictPort: true, // si 5173 está ocupado, falla en vez de saltar al 5174
  },
  build: {
    rollupOptions: {
      output: {
        /* Vendor chunks: separamos las librerías más pesadas para que el
           navegador las cachee de forma independiente y no engorden el chunk
           inicial. Combinado con React.lazy en las rutas, reduce el JS que
           bloquea el primer render (mejora TBT/LCP).
           El orden de los `if` importa: evaluamos primero los paquetes más
           específicos (mapbox/recharts) antes de la regla genérica de React. */
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Mapbox: el módulo más pesado; solo lo cargan los paneles con mapa.
          if (id.includes('mapbox-gl') || id.includes('react-map-gl')) return 'vendor-mapbox';
          // Recharts (+ d3): solo lo usa el Dashboard BI del admin.
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory')) return 'vendor-recharts';
          // Animaciones y utilidades de UI de uso transversal.
          if (
            id.includes('framer-motion') ||
            id.includes('lucide-react') ||
            id.includes('sonner') ||
            id.includes('canvas-confetti')
          ) return 'vendor-ui';
          // React core: cambia poco, ideal para cache de largo plazo.
          if (id.includes('react-router') || id.includes('/react-dom/') || id.includes('/react/') || id.includes('scheduler')) return 'vendor-react';
        },
      },
    },
  },
})