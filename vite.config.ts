import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on the current mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    // Use Vercel's URL or fallback to root
    base: env.VERCEL_URL ? `https://${env.VERCEL_URL}` : '/',
    
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      port: 5173,
      strictPort: true,
      open: true,
    },
    
    preview: {
      port: 4173,
      strictPort: true,
      host: true,
    },
    
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      // Ensure chunks are properly split for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            vendor: ['ethers', '@react-oauth/google'],
          },
        },
      },
    },
    
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  };
});
