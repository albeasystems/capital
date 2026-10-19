import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The site is published from the repository albeasystems/capital, so the base path is /capital/.
export default defineConfig({
  base: process.env.BASE_PATH || '/capital/',
  plugins: [react(), tailwindcss()],
  build: { rollupOptions: { input: 'index.html' } },
});
