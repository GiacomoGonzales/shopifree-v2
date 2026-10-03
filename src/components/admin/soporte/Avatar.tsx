// Logo de la tienda en redondo, o su inicial en gris si no tiene.
export default function Avatar({ logo, nombre, tamano = 'md' }: { logo?: string; nombre: string; tamano?: 'sm' | 'md' }) {
  const t = tamano === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-[12px]'
  return logo
    ? <img src={logo} alt="" className={`${t} rounded-full object-cover bg-gray-100 border border-gray-200 shrink-0`} />
    : <div className={`${t} rounded-full bg-gray-100 text-gray-600 font-medium flex items-center justify-center shrink-0`}>{nombre[0]?.toUpperCase() || '?'}</div>
}
