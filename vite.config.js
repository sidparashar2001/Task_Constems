import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves this project from /Task_Constems/.
  base: '/Task_Constems/',
  plugins: [react()],
});
