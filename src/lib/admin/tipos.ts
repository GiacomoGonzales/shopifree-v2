/**
 * Contrato del documento `adminStats/resumen` (Firestore), que calcula
 * api/admin-stats.ts (cron diario + botón "Actualizar ahora") y lee la página
 * Resumen. Cambiar un campo aquí = cambiarlo en los dos lados.
 *
 * Reglas de las cifras:
 * - El dinero va SIEMPRE por moneda (Record<moneda, monto>, moneda en
 *   minúsculas como la devuelve Stripe: 'usd', 'pen'…). Nunca se suman monedas.
 * - "Pagando" = estadoComercial === 'pagando' (src/lib/admin/modelo.ts, copiado
 *   en api/_shared/adminModelo.ts). Las pruebas de 7 días NO cuentan.
 * - Las comparaciones "mes anterior" van hasta el MISMO día del mes.
 */
import type { EstadoComercial } from './modelo'

export type PorMoneda = Record<string, number>

export interface TopItem {
  storeId: string
  nombre: string
  subdominio: string
  valor: number
  /** Solo en el top de ingresos: la moneda de la tienda. */
  moneda?: string
}

export interface ResumenAdmin {
  /** ISO de cuándo se calculó. */
  calculadoEn: string
  /** 'cron' | 'manual' */
  origen: string
  /** Milisegundos que tardó el cálculo. */
  duracionMs: number

  tiendas: {
    total: number
    nuevasHoy: number
    nuevas7d: number
    nuevasMes: number
    /** Altas del mes anterior hasta el mismo día del mes. */
    nuevasMesAnteriorMismoDia: number
  }
  usuarios: { total: number }
  productos: { total: number }

  /** Cuántas tiendas hay en cada estado comercial. */
  estados: Record<EstadoComercial, number>
  /** Tiendas pagando de verdad (Stripe al día), por plan. */
  pagando: { pro: number; business: number; total: number }

  /**
   * Conversión de la prueba: de las tiendas creadas en los últimos
   * `cohorteDias` días cuya prueba ya terminó, cuántas pagan hoy.
   */
  conversion: { cohorteDias: number; terminaronPrueba: number; pagan: number }

  /**
   * MRR desde Stripe: suscripciones activas normalizadas a un mes (las anuales
   * / 12), por moneda. `suscripciones` cuenta las activas; `anuales` cuántas
   * de ellas son anuales.
   */
  mrr: { porMoneda: PorMoneda; suscripciones: number; anuales: number; error?: string }

  /** Cobros reales (facturas pagadas de Stripe), por moneda. */
  cobros: {
    hoy: PorMoneda
    mes: PorMoneda
    mesAnteriorMismoDia: PorMoneda
    mesAnterior: PorMoneda
    error?: string
  }

  /** Últimos 12 meses, del más viejo al actual. mes = 'AAAA-MM'. */
  serie12m: Array<{ mes: string; altas: number; cobrado: PorMoneda; nuevasPagando: number }>

  /** Tiendas por país (código ISO; '' = sin país), de mayor a menor. */
  paises: Array<{ pais: string; tiendas: number; pagando: number }>

  /** Top 10 por métrica (de siempre). Ingresos: top 10 dentro de CADA moneda. */
  top: { visitas: TopItem[]; pedidos: TopItem[]; whatsapp: TopItem[]; ingresos: TopItem[]; error?: string }

  /** Vencen en los próximos 7 días (pagando, cortesía o prueba). */
  venceProximo: Array<{ storeId: string; nombre: string; subdominio: string; estado: EstadoComercial; vence: string }>
}
