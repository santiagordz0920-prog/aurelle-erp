# Módulo: Tareas + Dashboard "Hoy" (Fase 1)

> Los pendientes del equipo conectados al negocio (§3.15) y el pulso diario
> (§3.16). Cierra la Fase 1.

## Estado
Construido en Fase 1. Última modificación: 2026-07-05. Migración 0009.

## Tablas (migración 0009)
- `tarea` — titulo, detalle, responsable_id (→usuario), prioridad (enum baja/media/alta),
  estado (enum pendiente/hecha), fecha_vencimiento, **entidad_tipo + entidad_id**
  (vínculo polimórfico, sin FK; enum entidad_tarea: cliente/pedido/cotizacion/item_inventario/expo/proveedor),
  origen (enum manual/sugerida — gancho para IA de fases futuras), completada_at, creada_por.
  RLS por sucursal (NO solo-admin: el equipo comparte pendientes).

## Rutas / pantallas
- `/hoy` — **Dashboard v1**: KPIs reales (pipeline de cotizaciones vivas + valor, por cobrar de
  pedidos activos, entregas por vencer), tareas del día, y alertas derivadas (pedidos vencidos + saldo por cobrar).
- `/hoy/tareas` — lista completa (pendientes + hechas) con alta, prioridad, responsable, fecha y toggle.
- Ficha de cliente `/clientes/[id]` → pestaña **Tareas**: alta rápida "en dos toques" vinculada al cliente + lista.

## Capa de datos / acciones
- `src/lib/tareas.ts`: constantes + `vencimiento()` (semáforo por fecha) y `esDeHoy()` (pendiente vencida/hoy/sin fecha).
- `src/lib/data/tareas.ts`: `listarTareas(filtro)` (por estado/entidad), `tareasDeHoy()`.
- `src/lib/data/usuarios.ts`: `listarUsuarios()` — directorio ligero para el selector de responsable (reutilizable).
- `src/app/(app)/hoy/tareas/actions.ts`: `crearTarea`, `cambiarEstadoTarea` (toggle + completada_at), `eliminarTarea`.

## Eventos que emite / consume
- Consume (lectura) Clientes, Cotizador y Pedidos para el Dashboard — agregación en `/hoy`, sin escribir.
- El Dashboard NO muestra costo/margen (esos siguen solo-admin en su módulo); muestra total, saldo y valor de pipeline.
- Pendiente (fases futuras): tareas **sugeridas por IA** desde eventos (cotización sin respuesta, pedido atascado,
  stock bajo…) — el enum `origen='sugerida'` deja el gancho. Recurrentes también pendientes.

## Lógica no obvia / trampas
- "Tareas del día" = pendientes con fecha vencida, para hoy, o **sin fecha** (para que nada se pierda).
- Vínculo entidad es polimórfico (tipo+id, sin FK). `ENTIDAD_TAREA[tipo].ruta(id)` da el enlace; expo/proveedor aún sin ruta.
- El form de tarea es el mismo componente en `/hoy/tareas` (completo) y en la ficha (compacto, con `entidad` fija y colapsable).
- `crearTarea` sin responsable asigna al usuario actual (`responsable_id ?? usuario.id`).

## Pendientes conocidos de este módulo
- Vista del Dashboard **por rol** (Santiago vs Fer del §3.16) y notificaciones push/in-app configurables (fase posterior).
- Tareas sugeridas por IA + recurrentes (§3.15).
- Filtro "mías vs del equipo" en `/hoy/tareas` (hoy muestra todas las de la sucursal).
