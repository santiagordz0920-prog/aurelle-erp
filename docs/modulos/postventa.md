# Módulo: Postventa (Fase 6, §3.7)

> Convierte cada entrega en la siguiente venta: registro de pieza entregada
> (garantía + aniversarios), historial de servicios y métrica de recompra.

## Estado
Construido 2026-07-09. Migración **0030** (`pieza_entregada`, `servicio_pieza`).
v1: registro automático al entregar + servicios + overview con recompra. Build/lint
verdes + smoke. **El ENVÍO de campañas de lifecycle (limpieza al año, aniversarios)
espera el riel de WhatsApp;** aquí quedan los registros y las oportunidades visibles.

## Tablas (migración 0030)
- `pieza_entregada` — 1:1 con pedido (unique). `entregada_at`, `garantia_meses`
  (default 12), `garantia_hasta` (para "por vencer"), `aniversario_entrega`
  (recurre anual: recompra/limpieza), `aniversario_boda` (de `cliente.fecha_boda`),
  `cliente_id`, `notas`. RLS por sucursal.
- `servicio_pieza` — historial: `tipo` (limpieza/ajuste_talla/reparacion/rerodinado/otro),
  `descripcion`, `costo` (0 = cortesía), `fecha`. RLS vía pieza.

## Flujo / reacción §4
- **"Pedido entregado → Postventa crea registro":** `entregarPedido` llama
  `crearPiezaEntregadaSiNoExiste` (app-level, **idempotente** por `pedido_id` único).
  Calcula `garantia_hasta` (= entrega + 12m), `aniversario_entrega` (= fecha de entrega),
  `aniversario_boda` (del cliente). Mismo patrón que `crearContratoSiNoExiste`.

## Rutas / pantallas
- **Pedido** (`/ventas/pedidos/[id]`) → tarjeta **Postventa** (solo si entregado):
  garantía (vigente/por vencer/vencida), aniversarios, historial de servicios + form
  **Registrar servicio** (`ServicioForm` → `registrarServicio`).
- **`/clientes/postventa`** → overview: métrica de **recompra** (clientes con ≥2 pedidos /
  clientes con pieza + tasa %), **garantías por vencer (60d)** como oportunidad de contacto,
  y lista de piezas entregadas. Enlace "Postventa" en la cabecera de `/clientes`.

## Capa
- `src/lib/postventa.ts`: tipos + `TIPO_SERVICIO`, `fechaMasMeses`, `soloFecha`,
  `diasHasta`, `estadoGarantia` (cliente-safe).
- `src/lib/data/postventa.ts`: `getPiezaDePedido`, `resumenPostventa` (+ recompra).
  `src/lib/data/postventa-muestra.ts`: pieza + servicio de muestra.
- `src/app/(app)/ventas/pedidos/postventa-actions.ts`: `crearPiezaEntregadaSiNoExiste`,
  `registrarServicio`. `src/components/postventa/servicio-form.tsx`.

## Lógica no obvia / trampas
- El registro se crea **app-level** (no trigger de BD) para reusar el patrón y
  derivar aniversarios del cliente; idempotente por `pedido_id` único (marcar
  entregado 2 veces no duplica).
- **Recompra** = clientes con ≥2 pedidos (no cancelados) entre los que tienen pieza
  entregada. "Valor de segunda compra" (promedio) queda para v2.
- `costo` del servicio es lo que se cobra al cliente (ingreso), NO margen secreto:
  RLS por sucursal, no solo-admin.

## Pendientes / v2
- **Lifecycle que ENVÍA** (limpieza gratis al año, felicitación de aniversario, campaña
  churumbela/eternity) — requiere el riel de WhatsApp. Hoy las oportunidades se ven en
  `/clientes/postventa` y **se sugieren como tarea** (ver abajo) para contacto manual.
- **Ingreso por servicios → Finanzas** (asiento) y **cita de servicio → Citas**.
- Garantía configurable por tipo de pieza (hoy 12m fijo).
- Valor y ticket de segunda compra en la métrica de recompra.

## Cron de postventa (0033, v2)
- `generar_tareas_postventa()` (función aparte, la llama el mismo route del cron nocturno) crea **tareas sugeridas** ligadas al cliente: (A) **garantía por vencer** ≤30d, (B) **aniversario de entrega** ≤14d (mes-día), (C) **aniversario de boda** ≤14d. Idempotente por prefijo de título + cliente pendiente (incluye descartadas → no re-molesta). Aniversarios: match por mes-día en la ventana (sin `make_date`, sin problema de 29-feb). El **envío** por WhatsApp llega con el riel; hoy es tarea para contacto manual. Validado en Postgres local.
