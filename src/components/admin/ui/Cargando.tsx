// Estado de carga plano: una línea gris, sin spinners de colores.
export default function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <p className="px-4 py-10 text-center text-[12.5px] text-gray-500">{texto}</p>
}
