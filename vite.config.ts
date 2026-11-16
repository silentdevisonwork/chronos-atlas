import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname ?? '.', '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return;
            if (id.includes('three')) return 'three';
            if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
            if (id.includes('motion') || id.includes('framer-motion')) return 'motion';
            if (id.includes('@base-ui') || id.includes('@radix-ui') || id.includes('radix')) return 'ui';
            return 'vendor';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      // Object form so server.ts can attach HMR to the Express server (port 5000).
      hmr: process.env.DISABLE_HMR === 'true' ? false : {},
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
