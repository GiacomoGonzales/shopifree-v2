import { Navigate, useParams } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'

/**
 * Las rutas viejas del admin (stores, paid-stores, plans, users, feedback,
 * app-builds, media) siguen funcionando: redirigen a la sección nueva. `a`
 * puede llevar :storeId, que se reemplaza por el de la ruta vieja.
 */
export default function RedirigirAdmin({ a }: { a: string }) {
  const { storeId } = useParams()
  const { localePath } = useLanguage()
  return <Navigate to={localePath(a.replace(':storeId', storeId || ''))} replace />
}
