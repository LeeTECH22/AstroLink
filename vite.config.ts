/// <reference types="vitest" />
/// <reference types="node" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(new URL('.', import.meta.url).pathname, './src'),
      '@components': path.resolve(new URL('.', import.meta.url).pathname, './src/components'),
      '@hooks': path.resolve(new URL('.', import.meta.url).pathname, './src/hooks'),
      '@services': path.resolve(new URL('.', import.meta.url).pathname, './src/services'),
      '@types': path.resolve(new URL('.', import.meta.url).pathname, './src/types'),
      '@utils': path.resolve(new URL('.', import.meta.url).pathname, './src/utils'),
      '@assets': path.resolve(new URL('.', import.meta.url).pathname, './src/assets')
    }
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'react-chartjs-2', 'react-leaflet'],
          utils: ['axios', 'date-fns'],
          icons: ['lucide-react']
        }
      }
    }
  }
})
