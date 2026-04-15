# Shopifree Finanzas - Roadmap de Modulos

Estado: [ ] Pendiente | [x] Completado | [~] En progreso

---

## BLOQUE 1: Base financiera (ya implementado)

- [x] 1. Dashboard financiero basico (ingresos, por cobrar, ticket promedio)
- [x] 2. Registro de gastos con categorias
- [x] 3. Flujo de caja (ingresos vs egresos, balance)
- [x] 4. Switcher Tienda/Finanzas en header

---

## BLOQUE 2: Inventario y stock

- [ ] 5. Vista consolidada de inventario (todo el stock en una pantalla, filtros por categoria, alerta bajo stock)
- [ ] 6. Ajuste de inventario / Recuento (corregir stock manualmente con motivo)
- [x] 7. Movimientos de stock (historial automatico: venta, compra, ajuste, con fecha y motivo)
- [ ] 8. Multi-almacen (crear almacenes, asignar stock por almacen, transferencias)

---

## BLOQUE 3: Productos avanzado

- [x] 9a. Stock vive en variantes, global = suma de variantes (arreglado en inventario)
- [ ] 9b. Precio independiente por variante
- [ ] 10. Multiples presentaciones (unidad, caja x6, docena x12, pack — factor de conversion, precio propio, comparte stock base)
- [ ] 11. Multiples precios (mayorista, minorista, distribuidor por producto)
- [ ] 12. Precio "a consultar" (oculta precio, muestra boton de consulta, modo catalogo)
- [ ] 12b. Tipo "Servicio" (sin stock, trackStock=false por defecto)

---

## BLOQUE 4: Compras y proveedores

- [x] 13. CRUD de proveedores (nombre, contacto, productos que provee, notas)
- [x] 14. Registro de compras (proveedor, productos, cantidades, costo unitario, fecha)
- [x] 15. Compras alimentan stock (al registrar compra, suma automaticamente al inventario)
- [x] 16. Compras alimentan flujo de caja (aparecen como egreso en el flujo de caja)

---

## BLOQUE 5: Produccion

- [x] 17. Pagina de produccion (registrar cuando se produce/repone stock internamente)
- [x] 18. Ordenes de produccion (producto, cantidad, fecha, estado)

---

## BLOQUE 6: Sucursales

- [ ] 19. CRUD de sucursales (nombre, direccion, almacen asignado)
- [ ] 20. Stock por sucursal (cada sucursal ve su inventario)
- [ ] 21. Reportes por sucursal (ventas, stock, gastos filtrados por sucursal)

---

## BLOQUE 7: Reportes

- [ ] 22. Reporte de ventas (por dia, semana, mes, rango, metodo de pago)
- [ ] 23. Reporte de productos (mas vendidos, menos vendidos, sin movimiento)
- [ ] 24. Reporte de clientes (mejores clientes, frecuencia, valor de vida, por zona)
- [ ] 25. Reporte de costos y rentabilidad (costo vs precio, margen por producto)
- [ ] 26. Reporte de gastos (por categoria, comparacion entre periodos)
- [ ] 27. Exportar a Excel (pedidos, inventario, clientes, gastos, proveedores)

---

## BLOQUE 8: Dashboard mejorado

- [ ] 28. Dashboard con ventas del dia, semana, mes
- [ ] 29. Grafico de ventas (barras, ultimos 7/30 dias)
- [ ] 30. Top 5 productos mas vendidos
- [ ] 31. Indicadores clave (ticket promedio, conversion, pedidos pendientes)
- [ ] 32. Resumen de gastos vs ingresos del periodo

---

## BLOQUE 9: Clientes mejorado

- [ ] 33. Total gastado por cliente y cantidad de pedidos
- [ ] 34. Historial de compras por cliente
- [ ] 35. Segmentacion (nuevo, recurrente, VIP por monto)

---

## BLOQUE 10: PDFs y documentos

- [ ] 36. PDF de compra (detalle de compra a proveedor con items, totales, fecha)
- [ ] 37. PDF de venta/pedido (resumen del pedido para el cliente o para archivo)
- [ ] 38. PDF de movimiento de stock (ajuste, transferencia, con motivo y firma)
- [ ] 39. PDF de inventario (lista completa de productos con stock actual, costos, valor total)
- [ ] 40. PDF de lista de clientes (nombre, contacto, total gastado, pedidos)
- [ ] 41. PDF de lista de proveedores (nombre, contacto, productos que provee)
- [ ] 42. PDF de reporte financiero (resumen de periodo: ingresos, gastos, balance, graficos)
- [ ] 43. Boton "Descargar PDF" en cada pagina que aplique

---

## BLOQUE 11: Usuarios secundarios y permisos

- [ ] 44. Crear sub-usuarios (email + password, vinculados a la tienda)
- [ ] 45. Roles predefinidos (Admin, Vendedor, Almacenero, Contador, Solo lectura)
- [ ] 46. Permisos por pagina (elegir que paginas puede ver cada sub-usuario)
- [ ] 47. Pagina de gestion de equipo (lista de sub-usuarios, editar permisos, desactivar)
- [ ] 48. Proteccion de rutas (si no tiene permiso, no ve la pagina en el sidebar ni puede acceder)
- [ ] 49. Registro de actividad (quien hizo que: "Juan ajusto stock de Producto X", con fecha)

---

## COMO SE CONECTA TODO

```
VENTA (pedido) --> stock -N --> stock_movement (sale) --> revenue en dashboard
                                                      --> PDF de venta

COMPRA --> stock +N --> stock_movement (purchase) --> expense auto --> flujo de caja
       --> PDF de compra

AJUSTE --> stock = nuevo --> stock_movement (adjustment) --> PDF de movimiento

PRODUCCION --> stock +N --> stock_movement (production)

GASTO manual --> flujo de caja

PROVEEDOR <--> compras (relacion)
ALMACEN <--> stock por almacen en producto
SUCURSAL --> almacen asignado

SUB-USUARIO --> permisos --> solo ve paginas autorizadas
            --> registro de actividad (quien hizo que)
```

## SIDEBAR DE FINANZAS (estructura final)

```
Dashboard              /finance
-- separador --
Inventario             /finance/inventory
Ajustes                /finance/inventory/adjust
Movimientos            /finance/stock-movements
Almacenes              /finance/warehouses
-- separador --
Proveedores            /finance/suppliers
Compras                /finance/purchases
Produccion             /finance/production
-- separador --
Sucursales             /finance/branches
Gastos                 /finance/expenses
Flujo de caja          /finance/cashflow
-- separador --
Reportes               /finance/reports
```

## SIDEBAR DE TIENDA (se agrega)

```
... (items existentes) ...
-- separador --
Equipo                 /dashboard/team              (gestion de sub-usuarios)
```

## ORDEN DE IMPLEMENTACION (por dependencias)

Fase 1: Tipos + reglas Firestore + navegacion sidebar
Fase 2: Inventario (5, 6, 7) + integrar movimientos en ventas
Fase 3: Proveedores (13) + Compras (14, 15, 16)
Fase 4: Almacenes (8) + Sucursales (19)
Fase 5: Produccion (17, 18)
Fase 6: Dashboard mejorado (28-32) + Reportes (22-27)
Fase 7: PDFs (36-43) - se puede ir agregando a medida que se hacen las paginas
Fase 8: Sub-usuarios y permisos (44-49)

## COLECCIONES FIRESTORE (bajo stores/{storeId}/)

- suppliers/{id} - proveedores
- purchases/{id} - compras (items embebidos como en orders)
- stock_movements/{id} - historial de movimientos
- warehouses/{id} - almacenes
- branches/{id} - sucursales
- production_orders/{id} - ordenes de produccion
- expenses/{id} - gastos (ya existe)
- team_members/{id} - sub-usuarios (userId, role, permissions[], active)
- activity_log/{id} - registro de actividad (userId, action, details, createdAt)

## NOTAS

- Cada modulo se implementa uno por uno, se prueba, y se marca como completado
- Los bloques no tienen que ir en orden, se puede saltar al que mas urja
- Cuando entres a una nueva sesion, dile a Claude "hacemos la 5" o "bloque 2" y arranca
- Los datos estan interconectados: una compra afecta stock + flujo de caja + proveedor
- Los PDFs usan jsPDF (ya existe como dependencia en el proyecto o se agrega)
- Sub-usuarios se manejan con Firebase Auth + coleccion team_members para permisos
- Todos los modulos de finanzas van en el modo Finanzas (sidebar de finanzas)
- La gestion de equipo va en el modo Tienda (sidebar de tienda, seccion config)
