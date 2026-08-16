import { useCallback, useEffect, useRef, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * Alarma de pedidos sin atender, para el modo recepcion.
 *
 * Suena en bucle mientras haya al menos un pedido en `pending` y se calla sola
 * cuando no queda ninguno — es decir, cuando los aceptaron. Eso es "hasta que
 * lo atiendan": no un contador de tiempo, sino el estado real de la cola.
 *
 * ── Por que asi y no como llamada entrante ──────────────────────────────
 * La idea original era que sonara como un telefono, con pantalla completa.
 * Desde Android 14 ese permiso (USE_FULL_SCREEN_INTENT) quedo reservado a apps
 * de llamadas y alarmas, y desde enero de 2025 Play lo REVOCA al instalar en
 * las que no lo son. Shopifree gestiona tiendas: no califica, y pedirlo
 * arriesga fricción en cada revision.
 *
 * El escenario real no lo necesita. La tablet del mostrador esta encendida con
 * la app abierta, asi que alcanza con sonar desde la propia pagina: sin
 * permisos, sin codigo nativo, y funciona igual en Android, iPhone y navegador.
 *
 * El sonido se sintetiza con Web Audio, el mismo camino que el aviso de pedido
 * nuevo que ya existia. No hay archivo que empaquetar ni canal de Android que
 * configurar, y por lo tanto tampoco la trampa de los canales inmutables.
 *
 * LIMITE conocido: si la app queda en segundo plano o la pantalla se apaga, el
 * navegador suspende el audio y frena los temporizadores. Para ese caso hace
 * falta la notificacion push, que es harina de otro costal.
 */

/** Patron insistente: tres pulsos que alternan dos tonos. */
function tocarPulso(ctx: AudioContext) {
  const t0 = ctx.currentTime
  const tonos = [880, 1175, 880]
  tonos.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = freq
    const inicio = t0 + i * 0.22
    // Ataque y caida cortos: un tono plano satura y molesta mas de lo que avisa.
    gain.gain.setValueAtTime(0.0001, inicio)
    gain.gain.exponentialRampToValueAtTime(0.22, inicio + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.18)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(inicio)
    osc.stop(inicio + 0.2)
  })
}

const INTERVALO_MS = 3000

export function useOrderAlarm(storeId: string | undefined, habilitada: boolean) {
  const [pendientes, setPendientes] = useState(0)
  const [silenciado, setSilenciado] = useState(false)

  const ctxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendientesPrevios = useRef(0)

  // ── Cola de pedidos sin aceptar ──────────────────────────────────────
  useEffect(() => {
    if (!storeId || !habilitada) { setPendientes(0); return }
    const q = query(
      collection(db, 'stores', storeId, 'orders'),
      where('status', '==', 'pending')
    )
    const unsub = onSnapshot(q,
      snap => setPendientes(snap.docs.filter(d => !d.data().isTest).length),
      () => setPendientes(0)
    )
    return unsub
  }, [storeId, habilitada])

  // Un pedido NUEVO reactiva la alarma aunque se hubiera silenciado antes:
  // silenciar vale para la tanda que se estaba escuchando, no para siempre.
  useEffect(() => {
    if (pendientes > pendientesPrevios.current) setSilenciado(false)
    pendientesPrevios.current = pendientes
  }, [pendientes])

  const sonando = habilitada && pendientes > 0 && !silenciado

  // ── El bucle ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sonando) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }

    const AudioCtx = window.AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    if (!ctxRef.current) ctxRef.current = new AudioCtx()
    const ctx = ctxRef.current

    const sonar = () => {
      // Los navegadores arrancan el audio suspendido hasta que hay un gesto del
      // usuario. Se reintenta en cada pulso: asi, apenas alguien toque la
      // pantalla, la alarma se hace oir sin necesidad de reiniciar nada.
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}) ; return }
      tocarPulso(ctx)
    }

    sonar()
    timerRef.current = setInterval(sonar, INTERVALO_MS)
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [sonando])

  // Cerrar el contexto al desmontar; dejarlo abierto mantiene viva la salida de
  // audio del dispositivo sin motivo.
  useEffect(() => () => { ctxRef.current?.close().catch(() => {}) }, [])

  const silenciar = useCallback(() => setSilenciado(true), [])

  return { sonando, pendientes, silenciar }
}
