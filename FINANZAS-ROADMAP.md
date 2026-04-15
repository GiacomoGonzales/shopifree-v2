# Shopifree Finanzas - Roadmap de Modulos

Estado: [ ] Pendiente | [x] Completado | [~] En progreso

---

## BLOQUE 1: Base financiera

- [x] 1. Dashboard financiero basico
- [x] 2. Registro de gastos con categorias
- [x] 3. Flujo de caja (ingresos vs egresos, balance)
- [x] 4. Switcher Tienda/Finanzas en header y sidebar

---

## BLOQUE 2: Inventario y stock

- [x] 5. Vista consolidada de inventario (filtros, alertas, expansion por sucursal/almacen)
- [x] 6. Ajuste de inventario inline + recuento masivo
- [x] 7. Movimientos de stock (historial con filtros por tipo y periodo)
- [x] 8. Almacenes y sucursales (jerarquia sucursal > almacen, auto-create al registrar)

---

## BLOQUE 3: Productos avanzado

- [x] 9a. Combinaciones de variantes (modelo + formulario + inventario)
- [x] 9b. Precio independiente por combinacion (en tabla de combinaciones)
- [x] 9c. Tipos de negocio: todos con variantes, restaurante con modificadores
- [x] 9d. Stock readonly en edicion (solo se modifica por compras/produccion/ajustes)
- [ ] 10. Multiples presentaciones (unidad, caja x6, docena x12, pack)
- [ ] 11. Multiples precios (mayorista, minorista, distribuidor)
- [ ] 12. Precio "a consultar" (modo catalogo)
- [ ] 12b. Tipo "Servicio" (sin stock por defecto)

---

## BLOQUE 4: Compras y proveedores

- [x] 13. CRUD de proveedores
- [x] 14. Registro de compras (con variantes/combinaciones)
- [x] 15. Compras alimentan stock automaticamente
- [x] 16. Compras crean gasto automatico en flujo de caja

---

## BLOQUE 5: Produccion

- [x] 17. Ordenes de produccion (con selector de combinacion)
- [x] 18. Completar produccion suma stock + crea movimiento

---

## BLOQUE 6: Reportes

- [ ] 22. Reporte de ventas (por dia, semana, mes, metodo de pago)
- [ ] 23. Reporte de productos (mas vendidos, menos vendidos, sin movimiento)
- [ ] 24. Reporte de clientes (mejores clientes, frecuencia, por zona)
- [ ] 25. Reporte de costos y rentabilidad (margen por producto)
- [ ] 26. Reporte de gastos (por categoria, comparacion entre periodos)
- [ ] 27. Exportar a Excel (pedidos, inventario, clientes, gastos, proveedores)

---

## BLOQUE 7: Dashboard mejorado

- [x] 28. Dashboard con ventas del dia, semana, mes
- [x] 29. Grafico de ventas (barras, ultimos 7/30 dias)
- [x] 30. Top 5 productos mas vendidos
- [x] 31. Indicadores clave (ticket promedio, conversion, pedidos pendientes)
- [x] 32. Resumen de gastos vs ingresos del periodo

---

## BLOQUE 8: Clientes mejorado

- [ ] 33. Total gastado por cliente y cantidad de pedidos
- [ ] 34. Historial de compras por cliente
- [ ] 35. Segmentacion (nuevo, recurrente, VIP por monto)

---

## BLOQUE 9: PDFs y documentos

- [ ] 36. PDF de compra
- [ ] 37. PDF de venta/pedido
- [ ] 38. PDF de movimiento de stock
- [ ] 39. PDF de inventario
- [ ] 40. PDF de lista de clientes
- [ ] 41. PDF de lista de proveedores
- [ ] 42. PDF de reporte financiero
- [ ] 43. Boton "Descargar PDF" en cada pagina

---

## BLOQUE 10: Usuarios secundarios y permisos

- [ ] 44. Crear sub-usuarios (email + password, vinculados a la tienda)
- [ ] 45. Roles predefinidos (Admin, Vendedor, Almacenero, Contador, Solo lectura)
- [ ] 46. Permisos por pagina
- [ ] 47. Pagina de gestion de equipo
- [ ] 48. Proteccion de rutas
- [ ] 49. Registro de actividad

---

## COMO SE CONECTA TODO

```
VENTA --> stock -N --> stock_movement (sale) --> revenue en dashboard
COMPRA --> stock +N --> stock_movement (purchase) --> expense auto --> flujo de caja
AJUSTE --> stock = nuevo --> stock_movement (adjustment)
PRODUCCION --> stock +N --> stock_movement (production)
GASTO manual --> flujo de caja
PROVEEDOR <--> compras
ALMACEN <--> stock por almacen en producto
SUCURSAL --> almacenes
```

## SIDEBAR DE FINANZAS

```
Resumen              /finance
-- separador --
Inventario           /finance/inventory
Movimientos          /finance/stock-movements
Almacenes            /finance/warehouses
-- separador --
Proveedores          /finance/suppliers
Compras              /finance/purchases
Produccion           /finance/production
-- separador --
Gastos               /finance/expenses
Flujo de caja        /finance/cashflow
-- separador --
Reportes             /finance/reports
-- separador --
Mi cuenta            /finance/account
Chats                /finance/support-chats (solo admin)
```

## COLECCIONES FIRESTORE (bajo stores/{storeId}/)

- suppliers - proveedores
- purchases - compras (items embebidos)
- stock_movements - historial de movimientos
- warehouses - almacenes (con branchId)
- branches - sucursales
- production_orders - ordenes de produccion
- expenses - gastos

## PENDIENTES PARA PROXIMA SESION

Cuando entres, dile a Claude "que sigue" y el te dira los bloques pendientes.
Los mas impactantes: Dashboard mejorado (28-32) y Reportes (22-27).
