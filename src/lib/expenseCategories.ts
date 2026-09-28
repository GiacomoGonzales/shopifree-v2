// Las categorias de gasto se guardan en Firestore sin tilde ('Envios') y el
// codigo las compara asi; este mapa solo cambia como se muestran.
const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  Envios: 'Envíos',
}

export const expenseCategoryLabel = (category: string) => EXPENSE_CATEGORY_LABELS[category] || category
