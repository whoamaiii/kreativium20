import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return ({
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    hmr: {
      host: "127.0.0.1",
      clientPort: 5173,
      protocol: 'ws',
    },
    // Dev-only proxy to avoid browser CORS and OpenRouter Sites allowlist during local development
    // Usage: set VITE_AI_BASE_URL="/ai" (default for dev recommended) so client calls are proxied
    proxy: {
      '/ai': {
        target: 'https://openrouter.ai/api/v1',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/ai/, ''),
        headers: {
          // Inject API key server-side so it is not exposed in browser requests
          Authorization: env.VITE_OPENROUTER_API_KEY ? `Bearer ${env.VITE_OPENROUTER_API_KEY}` : '',
          'HTTP-Referer': 'http://127.0.0.1:5173',
          'X-Title': 'Sensory Compass',
        },
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
  plugins: [
    react(),
    // (mode === 'development' && process.env.COMPONENT_TAGGER !== '0') &&
    // componentTagger(),
    // Add bundle analyzer for build analysis
    mode !== 'development' && 
    visualizer({
      filename: "artifacts/bundle-stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      ...(mode === 'poc' ? {
        // Redirect heavy analytics worker to a tiny stub in POC mode
        '@/workers/analytics.worker': path.resolve(__dirname, './src/workers/analytics.worker.stub.ts'),
        // Redirect 3D component to a no-op stub in POC mode
        '@/components/Visualization3D': path.resolve(__dirname, './src/components/Visualization3D.poc.stub.tsx'),
      } : {})
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        entryFileNames: '[name].[hash].worker.js'
      }
    }
  },
  optimizeDeps: {
    exclude: ['echarts'],
    include: ['date-fns'],
    entries: ['index.html']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
          
          // Charts chunk - echarts only (recharts removed as unused)
          'charts': ['echarts', 'echarts-for-react'],
          
          // 3D chunk - three, @react-three/* (as per task requirements)
          '3d': ['three', '@react-three/fiber', '@react-three/drei'],
          
          // ML chunk - @tensorflow/* (as per task requirements)
          'ml': ['@tensorflow/tfjs'],
          
          // i18n chunk - i18next, react-i18next (as per task requirements)
          'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector', 'i18next-resources-to-backend']
        }
      }
    },
    chunkSizeWarningLimit: 2500,
    // In POC mode, alias the heavy analytics worker to a lightweight stub
    // This reduces initial download while preserving message contract
    // Note: we keep main aliasing in resolve; here we can still tweak rollup if needed
  }
  });
});