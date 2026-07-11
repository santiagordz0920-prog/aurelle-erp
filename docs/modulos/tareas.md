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
- `/hoy` — **Dashboard por rol (v2, 2026-07-09)** con toggle **Ventas / Taller** (`?vista=taller`):
  - **Ventas (Santiago):** KPIs (pipeline de cotizaciones vivas + valor, por cobrar de pedidos activos,
    entregas por vencer), citas de hoy, fechas importantes, alertas (pedidos vencidos + saldo).
  - **Taller (Fer):** KPIs (órdenes en taller, atascadas ≥7d, QC pendientes, categorías con stock bajo),
    **carga del taller por etapa**, entregas comprometidas (7 días), alertas del taller (atascos + stock bajo).
  - Ambas comparten **Tareas del día**. Santiago y Fer son ambos `admin` → la vista se elige por toggle
    (no por rol); `VistaVentas`/`VistaTaller` cargan solo sus datos. Sin costos/márgenes (solo-admin).
- `/hoy/tareas` — lista completa (pendientes + hechas) con alta, prioridad, responsable, fecha y toggle.
- Ficha de cliente `/clientes/[id]` → pestaña **Tareas**: alta rápida "en dos toques" vinculada al cliente + lista.

## Capa de datos / acciones
- `src/lib/tareas.ts`: constantes + `vencimiento()` (semáforo por fecha) y `esDeHoy()` (pendiente vencida/hoy/sin fecha).
- `src/lib/data/tareas.ts`: `listarTareas(filtro)` (por estado/entidad), `tareasDeHoy()`.
- `src/lib/data/usuarios.ts`: `listarUsuarios()` — directorio ligero para el selector de responsable (reutilizable).
- `src/app/(app)/hoy/tareas/actions.ts`: `crearTarea`, `cambiarEstadoTarea` (toggle + completada_at), `eliminarTarea`, **`aceptarSugerencia`** (origen→manual), **`descartarSugerencia`** (descartada=true).

## Eventos que emite / consume
- Consume (lectura) Clientes, Cotizador y Pedidos para el Dashboard — agregación en `/hoy`, sin escribir.
- El Dashboard NO muestra costo/margen (esos siguen solo-admin en su módulo); muestra total, saldo y valor de pipeline.
- Tareas **sugeridas por IA** (`origen='sugerida'`) — generadas por el cron nocturno `generar_tareas_seguimiento`
  (ver `docs/modulos/seguimiento-cron.md`). Cubre: pedido atascado (0025), contrato sin firmar (0025),
  **cotización sin respuesta ≥5d (0027)** y **stock bajo (0028)**. Pendiente: conversación caliente abandonada
  (requiere el riel de WhatsApp). Recurrentes también pendientes.

## Aceptar/descartar sugerencias (0031, §3.15 "en un toque")
- En `/hoy` (ambas vistas Ventas/Taller) y `/hoy/tareas`, una tarea `origen='sugerida'` pendiente muestra badge
  **"Sugerida"** + botones **Aceptar / Descartar** (`TareaItem`). El Dashboard las separa en una sección
  **"Sugerencias nuevas"** arriba de "mis tareas del día".
- **Aceptar** (`aceptarSugerencia`): `origen` pasa a `manual` → se vuelve tarea normal (checkbox + eliminar).
- **Descartar** (`descartarSugerencia`, migración **0031**): pone `descartada=true`. Se **oculta** de todas las
  vistas (`listarTareas` filtra `descartada=false`) pero **sigue `estado='pendiente'`**, así el cron idempotente
  (checa título + `estado='pendiente'`) **NO la vuelve a crear** cada noche. Validado en Postgres local.

## Lógica no obvia / trampas
- "Tareas del día" = pendientes con fecha vencida, para hoy, o **sin fecha** (para que nada se pierda).
- Vínculo entidad es polimórfico (tipo+id, sin FK). `ENTIDAD_TAREA[tipo].ruta(id)` da el enlace; expo/proveedor aún sin ruta.
- El form de tarea es el mismo componente en `/hoy/tareas` (completo) y en la ficha (compacto, con `entidad` fija y colapsable).
- `crearTarea` sin responsable asigna al usuario actual (`responsable_id ?? usuario.id`).

## Pendientes conocidos de este módulo
- ~~Tareas recurrentes~~ **HECHO (0032):** plantillas `tarea_recurrente` (semanal/mensual) en `/hoy/tareas/recurrentes`; el cron nocturno (`generar_tareas_recurrentes`, función aparte llamada por el mismo route) genera la instancia en `tarea` (origen='manual', `recurrente_id`), **idempotente por período** (una por semana/mes). Ver `docs/modulos/seguimiento-cron.md`.
- No hay "ver descartadas" / des-descartar (una sugerencia descartada queda oculta permanentemente).
- **Recordar la vista preferida por usuario** (hoy el toggle no persiste entre visitas; default = Ventas). Falta la columna/preferencia; v2. La distinción real Santiago/Fer necesitará distinguir usuarios (hoy ambos admin).
- Notificaciones push/in-app configurables (§3.16, fase posterior).
- Filtro "mías vs del equipo" en `/hoy/tareas` (hoy muestra todas las de la sucursal).
