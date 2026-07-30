import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { copyFile } from 'wpsjs/vite_plugins'
import { llmDevProxyPlugin } from './vite-plugins/llmDevProxy.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devPort = Number(env.VITE_DEV_PORT) || 3890

  return {
    base: './',
    plugins: [
      copyFile({
        src: 'manifest.xml',
        dest: 'manifest.xml'
      }),
      vue(),
      mode === 'development' ? llmDevProxyPlugin() : null
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      // wpsjs debug health-checks http://127.0.0.1:<port>. Binding to
      // "localhost" on Windows may be IPv6-only (::1) and cause
      // UnhandledPromiseRejection (reject with undefined) after Vite is ready.
      // Use 127.0.0.1 by default; set VITE_DEV_HOST=0.0.0.0 only for LAN access.
      host: env.VITE_DEV_HOST || '127.0.0.1',
      port: devPort,
      strictPort: false
    }
  }
})
