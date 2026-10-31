import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Управляет источником данных: true — встроенный offline-движок (см. src/lib/api.ts)
  define: {
    __PODRABOTKA_STANDALONE__: JSON.stringify(false),
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
