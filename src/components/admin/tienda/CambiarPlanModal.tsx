import { useMemo, useState } from 'react'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { useToast } from '../../ui/Toast'
import { Aviso, Boton, Campo, Entrada, Estado, Modal, cn } from '../ui'
import { invalidarTiendas, type AdminTienda } from '../../../lib/admin/datos'
import { aFecha, fecha } from '../../../lib/admin/formato'
import { ETIQUETA_ESTADO, ETIQUETA_PLAN, ETIQUETA_STRIPE, TONO_ESTADO, type Plan } from '../../../lib/admin/modelo'

/**
 * Cambiar el plan de una tienda a mano (cortesía del admin).
 *
 * Reemplaza el modal viejo de Tiendas, que guardaba con solo tocar un plan:
 * un clic distraído le cambiaba el plan a una tienda real. Ahora se elige,
 * se confirma con una frase ("Vas a cambiar X de Pro a Business…") y recién
 * ahí se escribe.
 *
 * Escribe EXACTAMENTE lo mismo que el modal viejo, porque es lo que entiende
 * hasPaidEffectivePlan (api/_shared/plan.ts) y su espejo planEfectivo
 * (src/lib/admin/modelo.ts):
 *  - plan, updatedAt
 *  - planExpiresAt: fecha (fin del día) o null. null = cortesía indefinida;
 *    en free también se pone null.
 *  - plan pago: se BORRA trialEndsAt, para que ningún cálculo caiga en una
 *    prueba vencida y la muestre como free.
 */

const PLANES: Plan[] = ['free', 'pro', 'business']

// Estados de Stripe en los que la suscripción sigue viva y el webhook puede
// volver a escribir `plan` (ver LIVE_SUBSCRIPTION_STATUSES en plan.ts, más
// incomplete, que también la toca al confirmarse el primer pago).
const STRIPE_VIVA = new Set(['active', 'trialing', 'past_due', 'incomplete'])

/** yyyy-mm-dd en hora local (toISOString corría la fecha un día en UTC-5). */
function aEntradaFecha(d: Date | null): string {
  if (!d) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function hoyEntrada(): string {
  return aEntradaFecha(new Date())
}

export default function CambiarPlanModal({ tienda, onClose, onGuardado }: {
  tienda: AdminTienda
  onClose: () => void
  onGuardado?: () => void
}) {
  const { showToast } = useToast()
  const fechaActual = useMemo(() => aEntradaFecha(aFecha(tienda.crudo.planExpiresAt)), [tienda])
  const [plan, setPlan] = useState<Plan>(tienda.plan)
  const [hasta, setHasta] = useState(tienda.plan === 'free' ? '' : fechaActual)
  const [confirmando, setConfirmando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const stripeViva = !!tienda.stripeSubscriptionId && STRIPE_VIVA.has(tienda.stripeStatus || '')
  const hastaEfectivo = plan === 'free' ? '' : hasta
  const sinCambios = plan === tienda.plan && hastaEfectivo === (tienda.plan === 'free' ? '' : fechaActual)
  const fechaTexto = hastaEfectivo ? fecha(new Date(hastaEfectivo + 'T23:59:59')) : ''

  const frase = (() => {
    const de = ETIQUETA_PLAN[tienda.plan]
    const a = ETIQUETA_PLAN[plan]
    const acceso = plan === 'free' ? '' : hastaEfectivo ? `, con acceso hasta el ${fechaTexto}` : ', sin fecha de fin'
    if (plan === tienda.plan) return `Vas a cambiar el acceso de ${tienda.nombre} (${a})${acceso}.`
    return `Vas a cambiar ${tienda.nombre} de ${de} a ${a}${acceso}.`
  })()

  const guardar = async () => {
    setGuardando(true)
    try {
      const datos: Record<string, unknown> = { plan, updatedAt: new Date() }
      if (plan !== 'free') datos.trialEndsAt = deleteField()
      datos.planExpiresAt = plan !== 'free' && hasta ? new Date(hasta + 'T23:59:59') : null
      await updateDoc(doc(db, 'stores', tienda.id), datos)
      invalidarTiendas()
      showToast(plan !== 'free' && hasta ? `Plan ${ETIQUETA_PLAN[plan]} hasta el ${fechaTexto}` : `Plan cambiado a ${ETIQUETA_PLAN[plan]}`, 'success')
      onGuardado?.()
      onClose()
    } catch (err) {
      console.error('Error al cambiar el plan:', err)
      showToast('No se pudo cambiar el plan', 'error')
      setGuardando(false)
    }
  }

  const pie = confirmando ? (
    <>
      <Boton onClick={() => setConfirmando(false)} disabled={guardando}>Volver</Boton>
      <Boton variante="primario" onClick={guardar} cargando={guardando}>Sí, cambiar plan</Boton>
    </>
  ) : (
    <>
      <Boton onClick={onClose}>Cancelar</Boton>
      <Boton variante="primario" onClick={() => setConfirmando(true)} disabled={sinCambios}>Guardar</Boton>
    </>
  )

  return (
    <Modal titulo="Cambiar plan" subtitulo={`${tienda.nombre} · ${tienda.subdominio}.shopifree.app`} onClose={onClose} pie={pie}>
      <div className="space-y-4">
        <p className="text-[12.5px] text-gray-600">
          Hoy: <span className="text-gray-900">{ETIQUETA_PLAN[tienda.plan]}</span>
          {tienda.planEfectivo !== tienda.plan && <span className="text-gray-500"> (usa {ETIQUETA_PLAN[tienda.planEfectivo]})</span>}
          {' · '}<Estado tono={TONO_ESTADO[tienda.estado]} etiqueta={ETIQUETA_ESTADO[tienda.estado]} />
          {tienda.vence && <> · vence el {fecha(tienda.vence)}</>}
          {tienda.stripeStatus && <> · Stripe: {ETIQUETA_STRIPE[tienda.stripeStatus] || tienda.stripeStatus}</>}
        </p>

        {stripeViva && (
          <Aviso>
            Esta tienda tiene una suscripción de Stripe activa. El próximo aviso de Stripe (renovación, cobro o
            sincronización) puede volver a escribir el plan y pisar este cambio manual.
          </Aviso>
        )}

        {confirmando ? (
          <p className="text-[13px] text-gray-900">{frase}</p>
        ) : (
          <>
            <div role="radiogroup" aria-label="Plan" className="grid grid-cols-3 gap-2">
              {PLANES.map(p => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={plan === p}
                  onClick={() => setPlan(p)}
                  className={cn(
                    'h-9 rounded-md border text-[12.5px] transition-colors',
                    plan === p ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {ETIQUETA_PLAN[p]}{p === tienda.plan && <span className="text-gray-500 font-normal"> · actual</span>}
                </button>
              ))}
            </div>

            {plan !== 'free' && (
              <Campo
                etiqueta="Acceso hasta (opcional)"
                ayuda={hasta
                  ? `El ${fecha(new Date(hasta + 'T23:59:59'))} a fin del día la tienda vuelve a Free.`
                  : 'Vacío = acceso indefinido (o hasta que Stripe lo gestione).'}
              >
                <div className="flex items-center gap-2">
                  <Entrada type="date" value={hasta} min={hoyEntrada()} onChange={e => setHasta(e.target.value)} className="max-w-[12rem]" />
                  {hasta && <Boton variante="enlace" tamano="sm" onClick={() => setHasta('')}>Quitar fecha</Boton>}
                </div>
              </Campo>
            )}
            {plan === 'free' && (
              <p className="text-[12px] text-gray-500">Free no lleva fecha: se borra cualquier acceso manual.</p>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
