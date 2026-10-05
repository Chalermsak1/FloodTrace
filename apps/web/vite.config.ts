import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'API_');
  const apiProxyTarget = env.API_PROXY_TARGET || process.env.API_PROXY_TARGET || 'http://localhost:8001';

  return {
  plugins: [react(), {
    name: 'ruwaigon-api-proxy-target',
    configureServer() {
      console.info(`[Ruwaigon] API proxy target: ${apiProxyTarget}`);
    }
  }],
  optimizeDeps: {
    exclude: ['maplibre-gl']
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-maplibre': ['maplibre-gl'],
          'vendor-leaflet': ['leaflet'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true
      }
    }
  }
  };
});
