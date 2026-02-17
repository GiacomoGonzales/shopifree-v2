import type { Product } from '../../types'

let _products: Product[] = []

export function setCatalogProducts(products: Product[]) {
  _products = products
}

export function getCatalogProducts(): Product[] {
  return _products
}
