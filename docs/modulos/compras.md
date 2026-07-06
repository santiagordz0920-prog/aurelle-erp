# Módulo: Compras a proveedor (Fase 2)

> Cierra el ciclo Proveedores↔Finanzas (§3.10). Área Dinero → solo-admin.

## Estado
Construido en Fase 2. Última modificación: 2026-07-06. Migración 0014. v1: cabecera
de compra + asiento automático + CxP a crédito. La alta de items de inventario desde
la compra queda pendiente (abajo).

## Tablas (migración 0014)
- `compra` — **SOLO-ADMIN**. proveedor_id, fecha, concepto, tipo (enum inventario/gasto),
  condicion_pago (enum contado/credito), monto, fecha_vencimiento, notas.

## Rutas / pantallas
- `/dinero/compras` — registrar compra (proveedor, tipo, condición, monto, vencimiento) + lista. Enlazada desde `/dinero/proveedores`.

## Capa de datos / acciones
- `src/lib/compras.ts`: tipos + etiquetas.
- `src/lib/data/compras.ts`: `listarCompras` (join proveedor).
- `src/app/(app)/dinero/compras/actions.ts`: `crearCompra` (zod; en local replica el efecto del trigger sobre movimientos/CxP).

## Eventos que emite / consume
- **Alimenta a Finanzas**: trigger `trg_compra_asiento` → `asiento_de_compra()` (SECURITY DEFINER): al registrar una compra crea el asiento en el ledger (`costo` si es inventario, `gasto` si es gasto) y, si es a **crédito**, la CxP al proveedor (`cuenta_por_pagar.proveedor_id`) con vencimiento. Al **contado** no hay CxP.
- Es la reacción §4 "compra → CxP + costo". Patrón trigger documentado en CONVENCIONES.

## Lógica no obvia / trampas
- El gasto/costo se reconoce al incurrirse (siempre); la CxP solo a crédito. Cuando la CxP se marca pagada (acción existente), ese es el egreso de caja — no se registra un segundo movimiento (evita doble conteo).
- En local (`supabaseConfigurado()` false) la acción empuja a mano el movimiento y la CxP porque el trigger de BD no corre; en prod los crea la base.

## Pendientes conocidos de este módulo
- **Alta automática de items de inventario** desde líneas de compra (§3.10): hoy la compra es cabecera; falta el detalle que dé de alta `item_inventario` + `item_costo`.
- Historial de precios por proveedor/categoría (¿subió el casting?) — las compras ya guardan el dato; falta la vista.
- Vínculo con sugerencias de recompra de Inventario.
