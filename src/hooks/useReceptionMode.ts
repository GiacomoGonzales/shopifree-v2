import { useCallback, useEffect, useState } from 'react'

/**
 * "Modo recepcion de pedidos": convierte el panel en un tablero para atender
 * pedidos que entran, pensado para la tablet del mostrador o la cocina.
 *
 * Cuando esta activo:
 *  - al entrar al panel se cae directo en Pedidos, no en Inicio
 *  - Pedidos muestra un tablero de tres etapas con botones grandes
 *  - (fase 2) la notificacion de pedido nuevo suena como timbre
 *
 * ── Por que POR DISPOSITIVO y no por tienda ─────────────────────────────
 * Un comercio suele tener el panel abierto en mas de un lado: la tablet del
 * mostrador y el celular del dueño. El modo recepcion tiene sentido en la
 * tablet —que esta para eso— y no en el celular, donde el dueño quiere entrar
 * a ver ventas sin que le suene un timbre a las once de la noche. Guardarlo en
 * la tienda forzaria los dos comportamientos iguales.
 *
 * Por eso vive en localStorage y NO en Firestore. Es la excepcion deliberada a
 * lo que se corrigio en el checklist de inicio (ver linkShared en Home.tsx),
 * donde localStorage estaba mal justamente porque ahi la marca describe algo de
 * la TIENDA. Aca describe este aparato.
 *
 * La clave lleva el id de la tienda: quien administra dos comercios desde la
 * misma tablet puede tener el modo activo en uno y no en el otro.
 */

const claveDe = (storeId: string) => `receptionMode_${storeId}`

/** Evento propio: sincroniza pestañas/componentes del mismo documento, que es
 *  algo que el evento 'storage' del navegador no cubre (solo avisa a OTRAS
 *  pestañas). Sin esto, activar el modo en Configuracion no se reflejaba en el
 *  layout hasta recargar. */
const EVENTO = 'reception-mode-change'

export function leerModoRecepcion(storeId: string | undefined): boolean {
  if (!storeId || typeof localStorage === 'undefined') return false
  return localStorage.getItem(claveDe(storeId)) === 'true'
}

export function useReceptionMode(storeId: string | undefined) {
  const [activo, setActivo] = useState(() => leerModoRecepcion(storeId))

  useEffect(() => {
    setActivo(leerModoRecepcion(storeId))
  }, [storeId])

  useEffect(() => {
    const sincronizar = () => setActivo(leerModoRecepcion(storeId))
    window.addEventListener(EVENTO, sincronizar)
    window.addEventListener('storage', sincronizar)
    return () => {
      window.removeEventListener(EVENTO, sincronizar)
      window.removeEventListener('storage', sincronizar)
    }
  }, [storeId])

  const cambiar = useCallback((valor: boolean) => {
    if (!storeId) return
    localStorage.setItem(claveDe(storeId), valor ? 'true' : 'false')
    setActivo(valor)
    window.dispatchEvent(new Event(EVENTO))
  }, [storeId])

  return { activo, cambiar }
}
