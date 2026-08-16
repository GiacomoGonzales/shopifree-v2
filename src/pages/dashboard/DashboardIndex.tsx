import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useReceptionMode } from '../../hooks/useReceptionMode'
import DashboardHome from './Home'

/**
 * Portada del panel.
 *
 * Normalmente es Inicio. Con el modo recepcion activo en ESTE dispositivo, se
 * entra directo a Pedidos: en una tablet de mostrador, ver el resumen de
 * ventas antes que los pedidos que estan esperando es un paso de mas cada vez
 * que se abre la app.
 *
 * Se espera a que la tienda cargue antes de decidir. Sin esa espera, el primer
 * render no conoce el id, leeria el modo como apagado y mostraria Inicio un
 * instante antes de saltar a Pedidos: un parpadeo en cada arranque.
 *
 * `replace` para no dejar Inicio en el historial — si no, el boton Atras del
 * telefono devolveria a una pantalla que en este modo no se quiere ver.
 */
export default function DashboardIndex() {
  const { store, loading } = useAuth()
  const { activo } = useReceptionMode(store?.id)

  if (loading || !store) return <DashboardHome />
  if (activo) return <Navigate to="orders" replace />
  return <DashboardHome />
}
