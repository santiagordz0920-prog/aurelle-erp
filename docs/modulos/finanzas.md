# Módulo: Finanzas (Fase 2 — en curso)

> Ledger solo-admin con asientos automáticos (§3.9). Reemplaza Contabilidad v1.

## Estado
Iniciado en Fase 2. Última modificación: 2026-07-05. Migración 0010. v1: ledger +
asiento automático al pagar + P&L del mes + capital de trabajo. Falta el resto (abajo).

## Tablas
- `movimiento_financiero` (0010) — **SOLO-ADMIN**. categoria (enum), concepto, monto (≥0; signo por categoría),
  linea_negocio, origen (text: pago/manual/…), pedido_id/pago_id, folio_factura (CFDI fuera del ERP).
- `cuenta_por_pagar` (0011) — **SOLO-ADMIN**. CxP a consignante (y futuros proveedores): consignante_id, item_id,
  pedido_id, concepto, monto, estado (enum pendiente/pagada/cancelada), fecha_vencimiento, pagada_at.

## Rutas / pantallas
- `/dinero` — KPIs (ingresos/egresos/neto del mes, capital atrapado, CxP) + **P&L del mes por línea** (Bridal/Concierge, % Concierge, avance vs meta $100k, ticket promedio) + sección CxP (marcar pagada) + captura manual + ledger. Solo-admin.
- `/dinero/proveedores` — directorio de proveedores (alta con categorías + condiciones).

## Capa de datos
- `src/lib/finanzas.ts`: constantes + `montoConSigno`.
- `src/lib/data/finanzas.ts`: `listarMovimientos` (vacío si no admin), `resumenFinanciero` (P&L del mes + capital atrapado = Σ por pedido activo de costo_real − pagado, solo positivo).

## Eventos que emite / consume
- **Consume Pagos**: trigger `trg_pago_asiento` → `asiento_de_pago()` (SECURITY DEFINER) crea el ingreso al pagar.
- **Consume Inventario**: trigger `trg_item_cxp` → `cxp_de_consignacion()` (SECURITY DEFINER) crea la CxP al consignante cuando una pieza de consignación pasa a `reservado` (monto = su costo). Sin duplicar.
- Ambos son de la matriz §4. Patrón documentado en CONVENCIONES.
- Pendiente consumir: costos de producción (Fase 4), Proveedores, Gastos recurrentes, Comisiones, Postventa.

## Lógica no obvia / trampas
- `monto` se guarda positivo; usar `montoConSigno()` para netos/P&L (ingreso/capital/deuda = +, costo/gasto/pago_deuda = −).
- El trigger es SECURITY DEFINER porque ventas (no-admin) registra pagos pero la tabla es solo-admin.
- El asiento vive en la MISMA transacción del pago: si el pago se revierte, revisar el movimiento (hoy no hay reverso automático de pagos).

## Pendientes conocidos de este módulo
- CxP a consignante al reservar/vender consignación; costos de producción; comisiones; gastos recurrentes; proveedores.
- P&L mensual COMPARATIVO mes a mes, proyección de flujo 30/60/90, reporte al socio (PDF). (P&L del mes por línea + métricas base ya hechas.)
- Captura manual de movimientos (hoy solo nacen del pago). Reverso de asiento al anular un pago.
