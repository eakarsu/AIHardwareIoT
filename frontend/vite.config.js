import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.HOST || '127.0.0.1',
    port: Number(process.env.FRONTEND_PORT || process.env.CLIENT_PORT || 3000),
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.BACKEND_PORT || process.env.PORT || 5001}`,
        changeOrigin: true
      }
    }
  }
});
