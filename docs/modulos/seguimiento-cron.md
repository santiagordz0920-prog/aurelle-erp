# Módulo: Cron de seguimiento (Fase 4)

> Cron nocturno que genera tareas automáticas de seguimiento a partir de la
> realidad del negocio (§4). Cierra dos avisos que dependían de que alguien se
> acordara.

## Estado
Construido en Fase 4. Última modificación: 2026-07-08. Migración 0025.
Build + lint verdes; función probada en Postgres local (crea + idempotente).

## Qué hace
Corre cada noche (Vercel Cron, `0 8 * * *` UTC ≈ 2 am Monterrey) y crea tareas
(`origen='sugerida'`, prioridad alta, ligadas al **pedido**):
1. **Atasco de producción:** orden ≥7 días en la misma etapa (no `listo_entrega`).
2. **Contrato sin firmar:** documento `contrato` en estado `enviado` con >48 h.

## Piezas
- `supabase/migrations/0025_tareas_seguimiento.sql`: función
  `generar_tareas_seguimiento()` (SECURITY DEFINER, `search_path=public`), grant a
  authenticated/service_role. Devuelve cuántas tareas creó.
- `src/app/api/cron/seguimiento/route.ts`: endpoint GET protegido por
  `CRON_SECRET` (Bearer). En modo muestra responde `creadas:0`.
- `vercel.json`: cron diario (además del mensual de gastos).

## Lógica no obvia / trampas
- **Idempotente:** antes de insertar verifica que NO exista ya una tarea
  `pendiente` de seguimiento para ese pedido, por **prefijo de título** ("Atasco
  en producción:" / "Contrato sin firmar:"). Por eso correrlo cada noche no
  duplica; y convive con el botón manual `crearTareaAtasco` (mismo prefijo).
- La tarea se liga a `entidad_tipo='pedido'` porque el enum `entidad_tarea` no
  tiene 'produccion' ni 'documento'; el documento y la orden ligan al pedido.
- La etiqueta de etapa se mapea a español con un `CASE` dentro de la función
  (espejo de `ETAPA_PRODUCCION`), para que el texto de la tarea lea natural.

## Pendientes conocidos
- Cuando el riel de WhatsApp esté vivo, estos avisos pueden además notificar
  (hoy solo crean tarea en `/hoy/tareas`).
- Config de umbrales (7 días / 48 h) por ahora en la función SQL; editable por
  Santiago sería una mejora posterior.
