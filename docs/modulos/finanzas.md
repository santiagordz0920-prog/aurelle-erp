# Módulo: Finanzas (Fase 2 — en curso)

> Ledger solo-admin con asientos automáticos (§3.9). Reemplaza Contabilidad v1.

## Estado
Iniciado en Fase 2. Última modificación: 2026-07-05. Migración 0010. v1: ledger +
asiento automático al pagar + P&L del mes + capital de trabajo. Falta el resto (abajo).

## Tablas (migración 0010)
- `movimiento_financiero` — **SOLO-ADMIN** (RLS `es_admin()`). categoria (enum: deuda/gasto/capital/ingreso/costo/pago_deuda),
  concepto, monto (siempre ≥0; el signo lo da la categoría), linea_negocio, origen (text), pedido_id/pago_id (vínculo),
  folio_factura (reconciliación con contador; CFDI fuera del ERP).

## Rutas / pantallas
- `/dinero` — KPIs (ingresos/egresos/neto del mes, capital de trabajo atrapado) + ledger de movimientos recientes. Solo-admin (doble puerta: UI + RLS).

## Capa de datos
- `src/lib/finanzas.ts`: constantes + `montoConSigno`.
- `src/lib/data/finanzas.ts`: `listarMovimientos` (vacío si no admin), `resumenFinanciero` (P&L del mes + capital atrapado = Σ por pedido activo de costo_real − pagado, solo positivo).

## Eventos que emite / consume
- **Consume Pedidos/Pagos**: trigger de BD `trg_pago_asiento` → `asiento_de_pago()` (SECURITY DEFINER) inserta el ingreso al registrar un pago. Primer evento de la matriz §4. Patrón documentado en CONVENCIONES.
- Pendiente consumir: Inventario (consumos/valor), Proveedores (CxP), Gastos recurrentes, Comisiones, Postventa.

## Lógica no obvia / trampas
- `monto` se guarda positivo; usar `montoConSigno()` para netos/P&L (ingreso/capital/deuda = +, costo/gasto/pago_deuda = −).
- El trigger es SECURITY DEFINER porque ventas (no-admin) registra pagos pero la tabla es solo-admin.
- El asiento vive en la MISMA transacción del pago: si el pago se revierte, revisar el movimiento (hoy no hay reverso automático de pagos).

## Pendientes conocidos de este módulo
- CxP a consignante al reservar/vender consignación; costos de producción; comisiones; gastos recurrentes; proveedores.
- P&L mensual comparativo por línea, proyección de flujo 30/60/90, reporte al socio (PDF), métricas (ticket, % Concierge, vs meta $100k).
- Captura manual de movimientos (hoy solo nacen del pago). Reverso de asiento al anular un pago.
