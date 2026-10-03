import { useEffect, useState } from 'react'
import { auth } from '../../../lib/firebase'
import { apiUrl } from '../../../utils/apiBase'
import { Tabla, Th, Td, Fila, FilaVacia, Aviso, Cargando, TarjetaDeFila, ListaTarjetas } from '../ui'
import { dinero, fecha } from '../../../lib/admin/formato'

/**
 * Los pagos de UNA tienda, para su ficha: list-payments filtrado por su
 * cliente de Stripe (parámetro `customer`). Las 20 últimas facturas pagadas.
 */
interface Pago {
  id: string
  amount: number
  currency: string
  created: number
  description: string | null
  invoiceUrl: string | null
  invoicePdf: string | null
}

export default function PagosDeTienda({ customerId }: { customerId: string }) {
  const [pagos, setPagos] = useState<Pago[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const user = auth.currentUser
        if (!user) throw new Error('No hay sesión iniciada')
        const token = await user.getIdToken()
        const res = await fetch(apiUrl('/api/sync-subscription'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'list-payments', customer: customerId, limit: 20 }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data?.error) throw new Error(data?.details || data?.error || `Error ${res.status}`)
        if (vivo) setPagos(data.payments || [])
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => { vivo = false }
  }, [customerId])

  if (error) return <Aviso tipo="error">No se pudieron cargar los pagos: {error}</Aviso>
  if (!pagos) return <Cargando />

  const enlaces = (p: Pago) => (
    <span className="space-x-3">
      {p.invoiceUrl && <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Factura ↗</a>}
      {p.invoicePdf && <a href={p.invoicePdf} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">PDF ↗</a>}
    </span>
  )

  return (
    <>
      <ListaTarjetas vacio="Sin pagos registrados en Stripe.">
        {pagos.map(p => (
          <TarjetaDeFila key={p.id} titulo={dinero(p.amount, p.currency)} subtitulo={fecha(p.created)} datos={[['Concepto', p.description], ['Enlaces', enlaces(p)]]} />
        ))}
      </ListaTarjetas>
      <div className="hidden sm:block -mx-4 -my-3">
        <Tabla>
          <thead><tr><Th>Fecha</Th><Th alinear="der">Monto</Th><Th>Concepto</Th><Th>Enlaces</Th></tr></thead>
          <tbody>
            {pagos.length === 0 && <FilaVacia colSpan={4}>Sin pagos registrados en Stripe.</FilaVacia>}
            {pagos.map(p => (
              <Fila key={p.id}>
                <Td>{fecha(p.created)}</Td>
                <Td numero>{dinero(p.amount, p.currency)}</Td>
                <Td apagado className="max-w-[320px] truncate">{p.description || '—'}</Td>
                <Td>{enlaces(p)}</Td>
              </Fila>
            ))}
          </tbody>
        </Tabla>
      </div>
    </>
  )
}
