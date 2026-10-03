import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { QRCodeCanvas } from 'qrcode.react'
import { db } from '../../lib/firebase'
import { useLanguage } from '../../hooks/useLanguage'
import { fechaCorta } from '../../lib/admin/formato'
import { Aviso, Boton, Cargando, Dato, Estado, ListaDatos, Pagina, Seccion } from '../../components/admin/ui'
import { ETIQUETA_BUILD, ETIQUETA_SOLICITUD, estadoBuild, nombrePaquete, textoVersion, TONO_BUILD, type TiendaApp } from '../../components/admin/apps/comun'

/**
 * Vista de solo lectura de la app de una tienda: lo que el dueño ve en
 * "Mi App" (ícono, colores, nombre, links de descarga con su QR) sin entrar
 * como él. Los controles de edición y las notificaciones push viven del lado
 * del dueño y aquí no sirven. Una lectura suelta: nada aquí cambia mientras
 * se mira.
 */
export default function AdminAppVista() {
  const { storeId } = useParams<{ storeId: string }>()
  const { localePath } = useLanguage()
  // Resultado de la última lectura, con el id que se pidió: mientras no
  // coincida con el de la URL, se está cargando (sin setState en el efecto).
  const [leido, setLeido] = useState<{ id: string; tienda: TiendaApp | null; error: string | null } | null>(null)

  useEffect(() => {
    if (!storeId) return
    let cancelado = false
    getDoc(doc(db, 'stores', storeId))
      .then(snap => {
        if (cancelado) return
        setLeido(snap.exists()
          ? { id: storeId, tienda: { id: snap.id, ...(snap.data() as Omit<TiendaApp, 'id'>) }, error: null }
          : { id: storeId, tienda: null, error: 'Tienda no encontrada' })
      })
      .catch(err => { if (!cancelado) setLeido({ id: storeId, tienda: null, error: err instanceof Error ? err.message : 'Error desconocido' }) })
    return () => { cancelado = true }
  }, [storeId])

  const cargando = !!storeId && leido?.id !== storeId
  const tienda = leido?.tienda ?? null
  const error = storeId ? leido?.error ?? null : 'Falta el id de la tienda'

  const volver = (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
      <Link to={localePath('/admin/apps')} className="text-blue-700 hover:underline">← Apps</Link>
      {storeId && <Link to={localePath(`/admin/tiendas/${storeId}`)} className="text-blue-700 hover:underline">Ficha de la tienda</Link>}
    </div>
  )

  if (cargando) return <Pagina resumen={volver}><Cargando /></Pagina>
  if (error || !tienda) return <Pagina resumen={volver}><Aviso tipo="error">{error || 'Tienda no encontrada'}</Aviso></Pagina>

  const cfg = tienda.appConfig
  const estado = cfg?.status || 'none'
  const nombreApp = cfg?.appName || tienda.name
  const slug = (nombreApp || tienda.subdomain || 'app').toLowerCase().replace(/[^a-z0-9]/g, '-')
  const testers = cfg?.publishInfo?.testers ?? []
  const icono = cfg?.icon || tienda.logo
  const hayLinks = estado === 'published' && (cfg?.androidUrl || cfg?.iosUrl)

  return (
    <Pagina
      resumen={volver}
      acciones={<span className="text-[12.5px] text-gray-500">Solicitud: <Estado etiqueta={ETIQUETA_SOLICITUD[estado] || estado} tono={estado === 'none' ? 'tenue' : 'normal'} /></span>}
    >
      <p className="text-[12.5px] text-gray-500">Así ve el dueño de <span className="text-gray-900">{tienda.name}</span> la sección Mi App. Solo lectura.</p>

      <Seccion titulo="App">
        <div className="flex items-start gap-4">
          {icono
            ? <img src={icono} alt={nombreApp} className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0" />
            : <div className="w-16 h-16 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-[18px] font-medium text-gray-500">{nombreApp[0]?.toUpperCase() || '?'}</div>}
          <ListaDatos className="flex-1">
            <Dato etiqueta="Nombre">{nombreApp}</Dato>
            <Dato etiqueta="Tienda">{tienda.subdomain}.shopifree.app</Dato>
            <Dato etiqueta="Package name"><span className="font-mono text-[12px]">{nombrePaquete(tienda.subdomain)}</span></Dato>
            <Dato etiqueta="Plan">{tienda.plan ? tienda.plan.charAt(0).toUpperCase() + tienda.plan.slice(1) : undefined}</Dato>
            <Dato etiqueta="Ícono">{cfg?.icon ? 'Propio de la app' : tienda.logo ? 'Logo de la tienda' : undefined}</Dato>
            <Dato etiqueta="Publicada">{cfg?.publishedAt ? fechaCorta(cfg.publishedAt) : undefined}</Dato>
            {(['android', 'ios'] as const).map(p => {
              const b = p === 'ios' ? cfg?.buildIos : cfg?.build
              const e = estadoBuild(b)
              return (
                <Dato key={p} etiqueta={p === 'ios' ? 'Build iOS' : 'Build Android'}>
                  <Estado etiqueta={ETIQUETA_BUILD[e]} tono={TONO_BUILD[e]} />
                  {textoVersion(b) && <span className="ml-1.5 text-gray-500 tabular-nums">{textoVersion(b)}</span>}
                </Dato>
              )
            })}
          </ListaDatos>
        </div>

        {(cfg?.primaryColor || cfg?.secondaryColor || cfg?.splashColor) && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-[12px] font-medium text-gray-700 mb-2">Colores de la marca</p>
            {/* Los colores sí van en color: son los de la tienda, no del admin. */}
            <div className="flex flex-wrap gap-4">
              {cfg?.primaryColor && <Muestra etiqueta="Principal" hex={cfg.primaryColor} />}
              {cfg?.secondaryColor && <Muestra etiqueta="Secundario" hex={cfg.secondaryColor} />}
              {cfg?.splashColor && <Muestra etiqueta="Splash" hex={cfg.splashColor} />}
            </div>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Links de descarga">
        {hayLinks ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {cfg?.androidUrl && <LinkConQr url={cfg.androidUrl} etiqueta={`Google Play Store${cfg.androidIsTesting ? ' (prueba cerrada)' : ''}`} archivo={`${slug}-android`} />}
            {cfg?.iosUrl && <LinkConQr url={cfg.iosUrl} etiqueta="Apple App Store" archivo={`${slug}-ios`} />}
          </div>
        ) : (
          <p className="text-[12.5px] text-gray-500">Aparecen cuando la app está publicada y tiene al menos un URL guardado.</p>
        )}
      </Seccion>

      {/* Testers: solo histórico. Google dejó de exigir la prueba cerrada de 12
          testers para cuentas de organización y la carga se quitó de Mi App;
          queda para consultar lo que ya estaba, sin el "/ 12". */}
      <Seccion titulo={`Testers internos (${testers.length})`}>
        {testers.length === 0 ? (
          <p className="text-[12.5px] text-gray-500">Sin correos cargados. Ya no se piden.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {testers.map(email => <li key={email} className="py-1 font-mono text-[12px] text-gray-700 truncate">{email}</li>)}
          </ul>
        )}
      </Seccion>
    </Pagina>
  )
}

function Muestra({ etiqueta, hex }: { etiqueta: string; hex: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded border border-gray-200 shrink-0" style={{ backgroundColor: hex }} />
      <div className="text-[11.5px]">
        <p className="text-gray-700">{etiqueta}</p>
        <p className="font-mono text-gray-500 uppercase">{hex}</p>
      </div>
    </div>
  )
}

// El QR es canvas (no SVG) para descargarlo como PNG en un clic, igual que
// AppDownloadCard del dueño, pero sin sus colores de acento.
function LinkConQr({ url, etiqueta, archivo }: { url: string; etiqueta: string; archivo: string }) {
  const caja = useRef<HTMLDivElement>(null)
  const descargar = () => {
    const canvas = caja.current?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `${archivo}-qr.png`
    a.click()
  }
  return (
    <div className="flex gap-3 rounded-md border border-gray-200 p-3">
      <div ref={caja} className="shrink-0">
        <QRCodeCanvas value={url} size={112} level="M" includeMargin={false} />
      </div>
      <div className="min-w-0 flex flex-col gap-1.5">
        <p className="text-[12.5px] font-medium text-gray-900">{etiqueta}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-blue-700 hover:underline break-all">{url}</a>
        <p className="text-[11.5px] text-gray-500">Escanéalo con el celular para descargar.</p>
        <div><Boton tamano="sm" onClick={descargar}>Descargar QR</Boton></div>
      </div>
    </div>
  )
}
