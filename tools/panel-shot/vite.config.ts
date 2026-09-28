/**
 * Servidor de desarrollo aparte para capturar el panel sin login y sin Firestore.
 *
 *   npx vite --config tools/panel-shot/vite.config.ts --port 5198 --strictPort
 *
 * Sirve la app de siempre (misma raiz, mismo index.html y src/main.tsx, mismo
 * plugin de React) con dos cambios, hechos al resolver modulos y sin tocar src/:
 *   - src/hooks/useAuth.tsx       -> tools/panel-shot/mock-auth.tsx (sesion de ejemplo)
 *   - 'firebase/firestore'        -> tools/panel-shot/mock-firestore.ts (datos en memoria,
 *                                    escrituras que no hacen nada)
 * Con eso tambien quedan mudos los oyentes del panel (presencia, pedidos nuevos,
 * chat de soporte, ShopiChat): todos leen y escriben por firebase/firestore.
 *
 * No afecta al build real: `vite build` usa el vite.config.ts de la raiz.
 */
import { defineConfig, normalizePath, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')

const REAL_USE_AUTH = normalizePath(resolve(root, 'src/hooks/useAuth.tsx'))
const MOCK_AUTH = normalizePath(resolve(here, 'mock-auth.tsx'))
const MOCK_FIRESTORE = normalizePath(resolve(here, 'mock-firestore.ts'))

function panelShotMocks(): Plugin {
  return {
    name: 'panel-shot-mocks',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (source === 'firebase/firestore') return MOCK_FIRESTORE
      // useAuth se importa con rutas relativas distintas desde cada archivo
      // ('../hooks/useAuth', '../../hooks/useAuth', './hooks/useAuth'...): se
      // resuelve normal y, si es el hook real, se cambia por el de ejemplo.
      if (/(^|\/)useAuth(\.tsx)?$/.test(source) && importer && normalizePath(importer) !== MOCK_AUTH) {
        const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
        if (resolved && normalizePath(resolved.id.split('?')[0]) === REAL_USE_AUTH) return MOCK_AUTH
      }
      return null
    },
  }
}

export default defineConfig({
  root,
  // Cache propia para no pisar la del servidor de siempre (5199).
  cacheDir: resolve(root, 'node_modules/.vite-panel-shot'),
  plugins: [panelShotMocks(), react()],
  define: {
    // Sin pixel de Meta aunque el .env lo tenga: estas visitas no son reales.
    'import.meta.env.VITE_META_PIXEL_ID': JSON.stringify(''),
  },
  server: {
    port: 5198,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  clearScreen: false,
})
