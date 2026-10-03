import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.API_URL ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The browser talks to one origin; Vite forwards API calls to Express.
    proxy: { '/api': { target: apiTarget } },
  },
  preview: {
    port: 4173,
    proxy: { '/api': { target: apiTarget } },
  },
});
