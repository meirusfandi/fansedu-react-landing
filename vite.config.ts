import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'node:https'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const pickProxyTarget = (): string => {
    if (env.VITE_API_PROXY_TARGET) return env.VITE_API_PROXY_TARGET
    const base = env.VITE_API_BASE_URL || env.VITE_API_URL
    if (base) {
      try {
        return new URL(base).origin
      } catch {
        // ignore invalid URL and fallback below
      }
    }
    return 'http://localhost:8080'
  }
  const proxyTarget = pickProxyTarget()
  const httpsAgent = proxyTarget.startsWith('https://')
    ? new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false,
    })
    : undefined

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: false,
          agent: httpsAgent,
          timeout: 60000,
          proxyTimeout: 60000,
        },
        /** Same-origin fetch dari App.tsx untuk parse halaman channel (hindari CORS di dev). */
        '/__youtube_channel': {
          target: 'https://www.youtube.com',
          changeOrigin: true,
          secure: true,
          rewrite: () => '/@fansedu.official/videos',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader(
                'User-Agent',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              )
              proxyReq.setHeader('Accept-Language', 'id-ID,id;q=0.9,en;q=0.8')
            })
          },
        },
      },
    },
  }
})