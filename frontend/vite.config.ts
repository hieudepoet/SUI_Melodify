import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/walrus-publisher': {
        target: 'https://publisher.walrus-testnet.walrus.space',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/walrus-publisher/, ''),
      },
      '/walrus-aggregator': {
        target: 'https://aggregator.walrus-testnet.walrus.space',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/walrus-aggregator/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['@mysten/walrus'],
    include: ['dataloader'],
  },
})
