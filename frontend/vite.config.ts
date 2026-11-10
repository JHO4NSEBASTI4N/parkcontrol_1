import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const entorno = loadEnv(mode, process.cwd(), '')

  // En desarrollo las peticiones /api se redirigen al backend FastAPI.
  // Así funciona tanto en localhost como en una vista previa remota,
  // sin exponer la URL interna del servidor en el navegador.
  const destino = entorno.VITE_PROXY_API || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: false,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: destino,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      allowedHosts: true,
    },
  }
})
