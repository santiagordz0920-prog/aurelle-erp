# Módulo: Comisiones (Fase 2)

> Comisiones a planners/referidores, % sobre la utilidad REAL (§3.9/§3.17).
> Área Dinero → solo-admin.

## Estado
Construido en Fase 2. Última modificación: 2026-07-06. Migración 0015. v1: registro
manual sobre un pedido con costo capturado. Devengo automático al entregar: pendiente.

## Tablas (migración 0015)
- `comision` — **SOLO-ADMIN**. pedido_id, beneficiario (texto), tipo (enum planner/referidor/otro),
  porcentaje, monto, estado (enum devengada/pagada/cancelada), pagada_at.

## Rutas / pantallas
- `/dinero/comisiones` — total por pagar + alta (elige pedido con costo capturado, beneficiario, tipo, %) + lista con "marcar pagada". Enlazada desde `/dinero`.

## Capa de datos / acciones
- `src/lib/comisiones.ts`: constantes + `calcularComision(utilidad, %)` (0 si utilidad ≤ 0).
- `src/lib/data/comisiones.ts`: `listarComisiones` (join cliente del pedido), `comisionesPorPagar`.
- `src/app/(app)/dinero/comisiones/actions.ts`: `crearComision` (calcula el monto en el servidor desde `pedido_costo`), `marcarPagadaComision`.

## Lógica no obvia / trampas
- **El monto se calcula SIEMPRE en el servidor**: utilidad = `pedido.total − pedido_costo.costo_real`, monto = % × utilidad. Nunca sobre el total; nunca se confía en el cliente.
- **Requiere costo real capturado**: si el pedido no tiene `pedido_costo`, la acción rechaza con mensaje (no se puede saber la utilidad). Solo pedidos con costo aparecen como elegibles en el form.
- `pedido_costo` es solo-admin: por eso todo el módulo es admin (la utilidad depende de un dato solo-admin).

## Pendientes conocidos de este módulo
- **Devengo automático al entregar** (matriz §4, "pedido entregado → Comisiones devenga si hay referidor"): hoy es manual. Requiere que el pedido lleve referidor + % (hoy no los tiene; `cliente.referido_por_*` es la fuente del lead, no un acuerdo de comisión).
- Asiento en el ledger al pagar la comisión (egreso) — hoy solo cambia estado.
- Editar/cancelar comisión (hoy: alta + marcar pagada).
