# Módulo: Cron de seguimiento / Tareas sugeridas (Fase 4 → Fase 5)

> Cron nocturno que genera tareas automáticas de seguimiento a partir de la
> realidad del negocio (§4 + §3.15 "tareas sugeridas por IA"). Cierra avisos que
> dependían de que alguien se acordara.

## Estado
Construido en Fase 4 (0025). Última modificación: 2026-07-09. Migraciones 0025 + **0027**.
Build + lint verdes; función probada en Postgres local (crea + idempotente para los 3 tipos).
**Fase 5 (paso 1, 0027):** se sumó el 3er tipo (cotización sin respuesta) — primer bloque de
"tareas sugeridas por IA" construible sin Meta.

## Qué hace
Corre cada noche (Vercel Cron, `0 8 * * *` UTC ≈ 2 am Monterrey) y crea tareas
(`origen='sugerida'`, ligadas a su entidad):
1. **Atasco de producción:** orden ≥7 días en la misma etapa (no `listo_entrega`). Prioridad alta, liga al **pedido**.
2. **Contrato sin firmar:** documento `contrato` en estado `enviado` con >48 h. Prioridad alta, liga al **pedido**.
3. **Cotización sin respuesta (0027, Fase 5):** cotización en estado `enviada` con `updated_at` ≥5 días (no pasó a `seguimiento`/`aceptada`/`vencida`). Prioridad media, liga a la **cotización** (`entidad_tipo='cotizacion'` → ruta `/ventas/cotizaciones/[id]`). Cierra la fila §4 "Cotización enviada → Tareas programa seguimiento".

## Piezas
- `supabase/migrations/0025_tareas_seguimiento.sql`: función
  `generar_tareas_seguimiento()` (SECURITY DEFINER, `search_path=public`), grant a
  authenticated/service_role. Devuelve cuántas tareas creó.
- `supabase/migrations/0027_sugerencia_cotizacion.sql`: **redefine** la misma función
  para añadir el 3er bloque (cotización sin respuesta) y sumar su conteo al retorno.
  Un solo cron nocturno sigue cubriendo los tres tipos.
- `src/app/api/cron/seguimiento/route.ts`: endpoint GET protegido por
  `CRON_SECRET` (Bearer). En modo muestra responde `creadas:0`.
- `vercel.json`: cron diario (además del mensual de gastos).

## Lógica no obvia / trampas
- **Idempotente:** antes de insertar verifica que NO exista ya una tarea
  `pendiente` de seguimiento para esa entidad, por **prefijo de título** ("Atasco
  en producción:" / "Contrato sin firmar:" / "Cotización sin respuesta:"). Por eso
  correrlo cada noche no duplica; y convive con el botón manual `crearTareaAtasco`
  (mismo prefijo). La de cotización revisa por `entidad_tipo='cotizacion'`+id.
- **Proxy de "sin respuesta" (cotización):** se usa `estado='enviada'` + `updated_at`
  ≥5 días. `updated_at` ≈ cuándo se envió/tocó por última vez (trigger de 0007). Si
  la cotización pasó a `seguimiento`/`aceptada`/`vencida`, ya no aplica.
- La tarea se liga a `entidad_tipo='pedido'` porque el enum `entidad_tarea` no
  tiene 'produccion' ni 'documento'; el documento y la orden ligan al pedido.
- La etiqueta de etapa se mapea a español con un `CASE` dentro de la función
  (espejo de `ETAPA_PRODUCCION`), para que el texto de la tarea lea natural.

## Pendientes conocidos
- Cuando el riel de WhatsApp esté vivo, estos avisos pueden además notificar
  (hoy solo crean tarea en `/hoy/tareas`).
- Config de umbrales (7 días / 48 h) por ahora en la función SQL; editable por
  Santiago sería una mejora posterior.
