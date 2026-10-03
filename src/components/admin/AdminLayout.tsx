import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { isAdminUser } from '../../lib/adminAccess'

/**
 * Marco del panel admin (rediseño oct-2026, mismas reglas que el admin de
 * Cobrify): menú plano solo texto, cabecera con el título de la página y un
 * buscador global (`/` lo enfoca, Enter abre Tiendas filtrado). Letra Inter
 * solo aquí (clase .admin), gris + un azul + rojo para lo malo.
 */

// Inter solo para el admin: el resto de la app usa Plus Jakarta Sans.
const INTER_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'
function useInter() {
  useEffect(() => {
    if (document.querySelector(`link[href="${INTER_URL}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = INTER_URL
    document.head.appendChild(link)
  }, [])
}

interface ItemMenu { nombre: string; ruta: string }

export default function AdminLayout() {
  const { firebaseUser, loading, logout } = useAuth()
  const { localePath } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const buscador = useRef<HTMLInputElement>(null)
  useInter()

  const menu: ItemMenu[] = useMemo(() => [
    { nombre: 'Resumen', ruta: localePath('/admin') },
    { nombre: 'Tiendas', ruta: localePath('/admin/tiendas') },
    { nombre: 'Cobros', ruta: localePath('/admin/cobros') },
    { nombre: 'Apps', ruta: localePath('/admin/apps') },
    { nombre: 'Soporte', ruta: localePath('/admin/soporte') },
    { nombre: 'Configuración', ruta: localePath('/admin/configuracion') },
  ], [localePath])

  const raiz = localePath('/admin')
  const activo = (ruta: string) => ruta === raiz ? location.pathname === raiz || location.pathname === raiz + '/' : location.pathname.startsWith(ruta)

  // Título de la cabecera: el ítem activo, o "Ficha de tienda" en una ficha.
  const titulo = useMemo(() => {
    if (/\/admin\/tiendas\/[^/]+/.test(location.pathname)) return 'Ficha de tienda'
    if (/\/admin\/apps\/[^/]+/.test(location.pathname)) return 'Vista de la app'
    return menu.find(m => activo(m.ruta))?.nombre || 'Admin'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, menu])

  useEffect(() => { document.title = `${titulo} · Admin Shopifree` }, [titulo])

  // Barra de estado en nativo (Android 15 edge-to-edge tapaba la cabecera).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const aplicar = () => {
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Light })
        StatusBar.setOverlaysWebView({ overlay: false })
        StatusBar.setBackgroundColor({ color: '#ffffff' })
      })
    }
    aplicar()
    window.addEventListener('resize', aplicar)
    return () => window.removeEventListener('resize', aplicar)
  }, [])

  const esAdmin = isAdminUser(firebaseUser)
  useEffect(() => {
    if (!loading && !esAdmin) navigate(localePath('/'))
  }, [esAdmin, loading, navigate, localePath])

  useEffect(() => { setMenuAbierto(false) }, [location.pathname])

  // "/" enfoca el buscador (salvo que ya estés escribiendo en otro campo).
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      buscador.current?.focus()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [])

  const buscar = (e: React.FormEvent) => {
    e.preventDefault()
    const q = busqueda.trim()
    navigate(`${localePath('/admin/tiendas')}${q ? `?q=${encodeURIComponent(q)}` : ''}`)
    setBusqueda('')
    buscador.current?.blur()
  }

  const salir = async () => {
    await logout()
    navigate(localePath('/login'))
  }

  if (loading) {
    return <div className="admin min-h-screen bg-gray-50 flex items-center justify-center text-[12.5px] text-gray-500">Cargando…</div>
  }
  if (!esAdmin || !firebaseUser) return null

  // Funciones (no componentes): un componente definido aquí adentro se
  // remontaría en cada tecla y el buscador perdería el foco.
  const pintarBuscador = (className = '') => (
    <form onSubmit={buscar} className={`relative ${className}`}>
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" /></svg>
      <input
        ref={el => { if (el && el.getClientRects().length > 0) buscador.current = el }}
        type="search"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder="Buscar tienda, subdominio o correo"
        className="h-8 w-full rounded-md border border-gray-300 bg-white pl-8 pr-8 text-[12.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
      />
      <kbd className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] text-gray-400 border border-gray-200 rounded px-1">/</kbd>
    </form>
  )

  const pintarMenu = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 h-12 px-4 border-b border-gray-200 shrink-0">
        <span className="text-[13px] font-semibold text-gray-900">Shopifree</span>
        <span className="text-[11.5px] text-gray-500">Admin</span>
      </div>
      <div className="lg:hidden px-3 pt-3">{pintarBuscador()}</div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {menu.map(item => (
          <Link
            key={item.ruta}
            to={item.ruta}
            className={`block px-3 py-1.5 rounded-md text-[13px] transition-colors ${activo(item.ruta) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            {item.nombre}
          </Link>
        ))}
      </nav>
      <div className="px-2 py-2 border-t border-gray-200 space-y-0.5">
        <Link to={localePath('/dashboard')} className="block px-3 py-1.5 rounded-md text-[12.5px] text-gray-600 hover:bg-gray-100 hover:text-gray-900">
          Ir a mi tienda ↗
        </Link>
        <div className="flex items-center justify-between gap-2 px-3 py-1.5">
          <span className="text-[11.5px] text-gray-500 truncate" title={firebaseUser.email || ''}>{firebaseUser.email}</span>
          <button onClick={salir} className="text-[11.5px] text-gray-500 hover:text-gray-900 shrink-0">Salir</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="admin min-h-screen bg-gray-50 text-[13px] text-gray-900" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Menú de escritorio: fijo, claro, 224 px. */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-200 z-30">
        {pintarMenu()}
      </aside>

      {/* Menú del celular: cajón. */}
      {menuAbierto && <div className="lg:hidden fixed inset-0 bg-gray-900/30 z-40" onClick={() => setMenuAbierto(false)} />}
      <aside className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 pt-[env(safe-area-inset-top)] transform transition-transform duration-200 ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}`}>
        {pintarMenu()}
      </aside>

      <div className="lg:pl-56">
        {/* Cabecera: título de la página + buscador global. */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 pt-[env(safe-area-inset-top)]">
          <div className="h-12 flex items-center gap-3 px-4 sm:px-6">
            <button onClick={() => setMenuAbierto(true)} aria-label="Abrir menú" className="lg:hidden p-1.5 -ml-1.5 rounded-md text-gray-600 hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className="text-[14px] font-semibold text-gray-900 truncate flex-1">{titulo}</h1>
            {pintarBuscador('hidden lg:block w-80')}
          </div>
        </header>

        <main className="px-4 py-4 sm:px-6 sm:py-5 max-w-[1400px]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
