import { Outlet } from 'react-router-dom'
import { SidebarProvider } from '../../contexts/SidebarContext'
import SharedMobileSidebar from './SharedMobileSidebar'

/**
 * Shell that wraps dashboard + finance routes. Renders the shared mobile
 * sidebar ONCE at this level so it stays mounted across mode switches
 * (Tienda ↔ Finanzas), avoiding remount flicker.
 */
export default function AppShell() {
  return (
    <SidebarProvider>
      <SharedMobileSidebar />
      <Outlet />
    </SidebarProvider>
  )
}
