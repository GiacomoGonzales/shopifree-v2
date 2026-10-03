import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../../hooks/useLanguage'
import { fechaCorta } from '../../../lib/admin/formato'
import {
  BotonDeFila, CajaMenu, Estado, Fila, FilaVacia, ItemMenu, ListaTarjetas, SeparadorMenu, Tabla, TarjetaDeFila, Td, Th, useMenuDeFila,
} from '../ui'
import {
  buildDe, compilando, ETIQUETA_BUILD, ETIQUETA_SOLICITUD, estadoBuild, nombrePaquete, sePuedeDescartar, textoVersion, TONO_BUILD,
  type Plataforma, type TiendaApp,
} from './comun'

export type AccionApp =
  | { tipo: 'compilar'; plataforma: Plataforma }
  | { tipo: 'publicar' }
  | { tipo: 'datos' }
  | { tipo: 'descartar' }

const abrir = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')

/**
 * Una fila por tienda: Tienda, App, Android, iOS, Publicada y el menú "⋯"
 * con todas las acciones. En el celular, las mismas filas como tarjetas.
 */
export default function TablaApps({ tiendas, vacio, onAccion }: {
  tiendas: TiendaApp[]
  vacio: string
  onAccion: (tienda: TiendaApp, accion: AccionApp) => void
}) {
  const { localePath } = useLanguage()
  const navigate = useNavigate()
  const menu = useMenuDeFila()
  const abierta = tiendas.find(t => t.id === menu.abiertoEn) || null

  const hacer = (fn: () => void) => () => { menu.cerrar(); fn() }

  const plataforma = (t: TiendaApp, p: Plataforma, compacto = false) => {
    const b = buildDe(t, p)
    const e = estadoBuild(b)
    const v = textoVersion(b)
    return (
      <div className="min-w-0">
        <Estado etiqueta={ETIQUETA_BUILD[e]} tono={TONO_BUILD[e]} />
        {v && <span className="ml-1.5 text-gray-500 tabular-nums">{v}</span>}
        {e === 'failed' && b?.lastError && (
          <div className={`text-[11.5px] text-red-600 ${compacto ? 'break-words' : 'truncate max-w-[220px]'}`} title={b.lastError}>{b.lastError}</div>
        )}
      </div>
    )
  }

  const publicada = (t: TiendaApp) => {
    const cfg = t.appConfig
    if (cfg?.status === 'published') {
      return (
        <span className="tabular-nums">
          {cfg.publishedAt ? fechaCorta(cfg.publishedAt) : 'Sí'}
          {cfg.androidUrl && cfg.androidIsTesting && <span className="text-gray-500"> · prueba cerrada</span>}
        </span>
      )
    }
    return <Estado etiqueta={ETIQUETA_SOLICITUD[cfg?.status || 'none'] || '—'} tono="tenue" />
  }

  const logo = (t: TiendaApp) => t.logo
    ? <img src={t.logo} alt="" className="w-7 h-7 rounded object-cover shrink-0 border border-gray-200" />
    : <div className="w-7 h-7 rounded bg-gray-100 shrink-0 flex items-center justify-center text-[11px] font-medium text-gray-500">{t.name[0]?.toUpperCase() || '?'}</div>

  return (
    <>
      <ListaTarjetas vacio={vacio}>
        {tiendas.map(t => (
          <TarjetaDeFila
            key={t.id}
            titulo={t.name}
            subtitulo={t.appConfig?.appName || t.subdomain}
            acciones={<BotonDeFila onClick={el => menu.alternar(t.id, el)} />}
            datos={[
              ['Android', plataforma(t, 'android', true)],
              ['iOS', plataforma(t, 'ios', true)],
              ['Publicada', publicada(t)],
            ]}
          />
        ))}
      </ListaTarjetas>

      <div className="hidden sm:block">
        <Tabla>
          <thead>
            <tr>
              <Th>Tienda</Th>
              <Th>App</Th>
              <Th>Android</Th>
              <Th>iOS</Th>
              <Th>Publicada</Th>
              <Th ancho={44} />
            </tr>
          </thead>
          <tbody>
            {tiendas.length === 0 && <FilaVacia colSpan={6}>{vacio}</FilaVacia>}
            {tiendas.map(t => (
              <Fila key={t.id} seleccionada={menu.abiertoEn === t.id}>
                <Td>
                  <div className="flex items-center gap-2 min-w-0">
                    {logo(t)}
                    <div className="min-w-0">
                      <div className="font-medium truncate max-w-[200px]">{t.name}</div>
                      <div className="text-[11.5px] text-gray-500 truncate max-w-[200px]">{t.subdomain}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="truncate max-w-[220px]">{t.appConfig?.appName || t.name}</div>
                  <div className="text-[11.5px] text-gray-500 font-mono truncate max-w-[220px]">{nombrePaquete(t.subdomain)}</div>
                </Td>
                <Td>{plataforma(t, 'android')}</Td>
                <Td>{plataforma(t, 'ios')}</Td>
                <Td>{publicada(t)}</Td>
                <Td alinear="der"><BotonDeFila onClick={el => menu.alternar(t.id, el)} /></Td>
              </Fila>
            ))}
          </tbody>
        </Tabla>
      </div>

      {abierta && (() => {
        const t = abierta
        const cfg = t.appConfig
        const and = buildDe(t, 'android')
        const ios = buildDe(t, 'ios')
        return (
          <CajaMenu posicion={menu.posicion} refMenu={menu.refMenu}>
            {compilando(and)
              ? <p className="px-3 py-1.5 text-[12.5px] text-gray-400">Android compilando…</p>
              : <ItemMenu onClick={hacer(() => onAccion(t, { tipo: 'compilar', plataforma: 'android' }))}>Generar build Android…</ItemMenu>}
            {compilando(ios)
              ? <p className="px-3 py-1.5 text-[12.5px] text-gray-400">iOS compilando…</p>
              : <ItemMenu onClick={hacer(() => onAccion(t, { tipo: 'compilar', plataforma: 'ios' }))}>Generar build iOS…</ItemMenu>}
            {and?.artifactUrl && <ItemMenu onClick={hacer(() => abrir(and.artifactUrl!))}>Descargar AAB</ItemMenu>}
            {ios?.artifactUrl && <ItemMenu onClick={hacer(() => abrir(ios.artifactUrl!))}>Descargar IPA</ItemMenu>}
            {and?.runUrl && <ItemMenu onClick={hacer(() => abrir(and.runUrl!))}>Logs Android ↗</ItemMenu>}
            {ios?.runUrl && <ItemMenu onClick={hacer(() => abrir(ios.runUrl!))}>Logs iOS ↗</ItemMenu>}
            <SeparadorMenu />
            <ItemMenu onClick={hacer(() => onAccion(t, { tipo: 'publicar' }))}>
              {cfg?.androidUrl || cfg?.iosUrl ? 'Editar URLs de descarga…' : 'Agregar URLs de descarga…'}
            </ItemMenu>
            {cfg?.androidUrl && <ItemMenu onClick={hacer(() => abrir(cfg.androidUrl!))}>Ver en Play Store ↗</ItemMenu>}
            {cfg?.iosUrl && <ItemMenu onClick={hacer(() => abrir(cfg.iosUrl!))}>Ver en App Store ↗</ItemMenu>}
            <ItemMenu onClick={hacer(() => onAccion(t, { tipo: 'datos' }))}>
              Datos para Play Console…{(cfg?.publishInfo?.testers?.length ?? 0) > 0 && <span className="text-gray-500 tabular-nums"> ({cfg!.publishInfo!.testers!.length} testers)</span>}
            </ItemMenu>
            <SeparadorMenu />
            <ItemMenu onClick={hacer(() => navigate(localePath(`/admin/apps/${t.id}`)))}>Vista de la app</ItemMenu>
            <ItemMenu onClick={hacer(() => navigate(localePath(`/admin/tiendas/${t.id}`)))}>Ficha de la tienda</ItemMenu>
            {sePuedeDescartar(t) && (
              <>
                <SeparadorMenu />
                <ItemMenu rojo onClick={hacer(() => onAccion(t, { tipo: 'descartar' }))}>Descartar…</ItemMenu>
              </>
            )}
          </CajaMenu>
        )
      })()}
    </>
  )
}
