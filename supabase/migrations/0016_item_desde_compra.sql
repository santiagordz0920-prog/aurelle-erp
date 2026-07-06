-- ═══════════════════════════════════════════════════════════════════════════
-- 0016_item_desde_compra — Fase 2
-- Cierra la mitad Proveedores↔Inventario del ciclo de compras (§3.10): una
-- compra de inventario puede dar de alta la pieza en Inventario. Este archivo
-- solo agrega la trazabilidad item→compra; el alta la hace el Server Action
-- crearCompra (crea item_inventario + item_costo), no un trigger, porque
-- involucra SKU/valores que decide el usuario.
--
-- Nota contable (v1, ver docs/modulos/compras.md): la compra de inventario ya
-- expensa su costo en el ledger al comprar; el item_costo del alta es valuación
-- de stock (no se suma al P&L) → sin doble conteo.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.item_inventario
  add column compra_id uuid references public.compra(id) on delete set null;

create index idx_item_compra on public.item_inventario (compra_id);
