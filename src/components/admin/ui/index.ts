// Kit del panel admin. Reglas: gris + un azul (activo, primario, enlaces) +
// rojo solo para lo malo. Letra Inter 13 px, cifras tabulares, sin tarjetas
// KPI, sin sombras, sin emojis. Toda tabla tiene su versión en tarjetas para el
// celular (ListaTarjetas / TarjetaDeFila con sm:hidden, tabla con hidden sm:block).
export { default as Pagina } from './Pagina'
export { default as Seccion } from './Seccion'
export { Tabla, Th, Td, Fila, FilaVacia, siguienteOrden, type Orden } from './Tabla'
export { Filtros, FiltroSelect, Buscador } from './Filtros'
export { default as Estado } from './Estado'
export { default as Boton } from './Boton'
export { ListaDatos, Dato } from './ListaDatos'
export { Cifras, Cifra } from './Cifras'
export { default as Aviso } from './Aviso'
export { default as Modal } from './Modal'
export { default as Pestanas, type OpcionPestana } from './Pestanas'
export { default as TarjetaDeFila, ListaTarjetas } from './Tarjeta'
export { Campo, Entrada, Selector, AreaTexto, Casilla } from './Campo'
export { useMenuDeFila, BotonDeFila, CajaMenu, ItemMenu, SeparadorMenu } from './MenuDeFila'
export { default as Paginacion } from './Paginacion'
export { default as Cargando } from './Cargando'
export { cn } from './cn'
