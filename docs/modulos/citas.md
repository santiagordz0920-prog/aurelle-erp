# Módulo: Citas (Fase 3)

> Calendario del showroom Ellion (§3.2). Base sobre la que el bot reservará
> cuando el riel de WhatsApp esté vivo; usable a mano desde ya.

## Estado
Construido en Fase 3 (primer módulo, sin dependencia de Meta). Última modificación:
2026-07-06. Migración 0017.

## Tablas (migración 0017)
- `cita` — RLS por sucursal (Ventas la necesita). cliente_id, tipo (enum: primera_visita/
  seguimiento/cierre/entrega/postventa/noche_privada), sala (enum piso_ventas/closing_room),
  inicio (timestamptz), duracion_min, estado (agendada/confirmada/completada/cancelada),
  **resultado** (no_asistio/asistio/cotizo/cerro = el funnel), pedido_id (entregas), notas.

## Rutas / pantallas
- `/clientes/citas` — agenda agrupada por día (hoy primero) + alta. Enlace desde `/clientes`.
- Ficha de cliente → pestaña **Citas**: alta + historial de ese cliente.
- Dashboard `/hoy` → tarjeta **Citas de hoy**.

## Capa de datos / acciones
- `src/lib/citas.ts`: constantes + `seTraslapan()` + `finCita()`.
- `src/lib/data/citas.ts`: `listarCitas(filtro)`, `citasDeHoy()`.
- `src/app/(app)/clientes/citas/actions.ts`: `agendarCita` (candado anti doble-reserva por sala),
  `cambiarEstadoCita` (confirmar/cancelar), `registrarResultado` (marca completada + resultado).

## Lógica no obvia / trampas
- **Zona horaria:** el input es datetime-local (sin TZ); se ancla a Monterrey (**UTC-6 fijo**, MX sin
  horario de verano desde 2022) al guardar (`...-06:00`) y se muestra con `timeZone: America/Monterrey`.
  Sin esto, en Vercel (UTC) las horas se correrían 6h.
- **Anti doble-reserva:** se valida en el Server Action (traslape por sala el mismo día), NO con
  constraint de BD. v2 podría usar exclusion constraint (btree_gist).
- El **resultado** es el dato de oro (funnel inquiry→visita→cotización→cierre). Captura en un toque.

## Pendientes conocidos / lo que se enchufa con el riel de WhatsApp
- **Reserva por el bot** (Fase 3, cuando Meta esté listo): el bot ofrece horarios reales y agenda.
- Confirmación + recordatorios (24h/2h) por **plantillas aprobadas** de WhatsApp.
- Reacción §4: resultado → mueve el pipeline del cliente; no-show → lifecycle de re-engagement.
- Horarios disponibles calculados (hoy el candado solo rechaza traslapes; no sugiere huecos libres).
- Vista de calendario tipo grid (hoy es lista por día).
