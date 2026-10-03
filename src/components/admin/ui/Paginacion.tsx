// Paginación simple: "1–20 de 612" y Anterior / Siguiente.
export default function Paginacion({ pagina, porPagina, total, onCambiar }: {
  pagina: number
  porPagina: number
  total: number
  onCambiar: (pagina: number) => void
}) {
  if (total <= porPagina) return null
  const desde = pagina * porPagina + 1
  const hasta = Math.min(total, (pagina + 1) * porPagina)
  const ultima = Math.ceil(total / porPagina) - 1
  const btn = 'h-7 px-2.5 rounded-md border border-gray-300 bg-white text-[12px] text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-[12px] text-gray-500 tabular-nums">
      <span>{desde}–{hasta} de {total}</span>
      <div className="flex gap-2">
        <button type="button" className={btn} disabled={pagina <= 0} onClick={() => onCambiar(pagina - 1)}>Anterior</button>
        <button type="button" className={btn} disabled={pagina >= ultima} onClick={() => onCambiar(pagina + 1)}>Siguiente</button>
      </div>
    </div>
  )
}
