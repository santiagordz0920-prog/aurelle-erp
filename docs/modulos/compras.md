# Módulo: Compras a proveedor (Fase 2)

> Cierra el ciclo Proveedores↔Finanzas (§3.10). Área Dinero → solo-admin.

## Estado
Construido en Fase 2. Última modificación: 2026-07-06. Migración 0014. v1: cabecera
de compra + asiento automático + CxP a crédito. La alta de items de inventario desde
la compra queda pendiente (abajo).

## Tablas (migración 0014, +0016)
- `compra` — **SOLO-ADMIN**. proveedor_id, fecha, concepto, tipo (enum inventario/gasto),
  condicion_pago (enum contado/credito), monto, fecha_vencimiento, notas.
- `item_inventario.compra_id` (0016) — liga la pieza dada de alta a su compra (trazabilidad / historial de precios).

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
- ~~Alta de items de inventario desde la compra~~ HECHO (0016): una compra de inventario con SKU+nombre da de alta `item_inventario` (propio/disponible, ligado a la compra) + `item_costo` = monto. Nota contable: la compra ya expensa el costo en el ledger; el item_costo es valuación de stock (no se suma al P&L). Pendiente: cantidad>1 (hoy 1 pieza por compra).
- Historial de precios por proveedor/categoría (¿subió el casting?) — las compras ya guardan el dato; falta la vista.
- Vínculo con sugerencias de recompra de Inventario.
