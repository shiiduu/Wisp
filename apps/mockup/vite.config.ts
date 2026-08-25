import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/mockup/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
  },
  server: {
    // @wisp/data lives outside this app's root; allow Vite's dev server
    // to serve its JSON + icon assets from the workspace root.
    fs: {
      allow: ['../..'],
    },
  },
});
