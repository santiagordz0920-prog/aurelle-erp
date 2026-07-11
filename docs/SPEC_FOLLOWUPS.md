# Spec: Módulo de follow-up de leads (cadencias)

> Recibido de Santiago el 2026-07-11 (redactado con otra sesión de IA). Guardado
> íntegro aquí + anotaciones de ingeniería al final. Santiago pidió explícitamente
> iterarlo: "va a sonar prescriptivo, pero hay que ir viendo qué vale la pena y qué no".
> Estado: PENDIENTE de diseño detallado (esquema + pantallas) y aprobación funcional.

## 1. Qué es el negocio
Aurelle & Co. vende anillos de compromiso y argollas custom high-ticket (~$15k+ de
margen neto por venta) en Monterrey. Leads por ads de Meta a WhatsApp e Instagram DM.
Cuello de botella: conversión consulta→visita (~6%); tras visitar el showroom el
cierre es 80%+. El módulo existe para una sola cosa: que ningún lead muera por falta
de seguimiento y maximizar citas agendadas.

## 2. Stack y convenciones
- Next.js en Vercel + Supabase (Postgres). Interfaz 100% en español. `sucursal_id` en toda tabla relevante.
- Canal: WhatsApp Business Cloud API (exclusivo). Instagram DM manual por ahora.
- Mensajes firmados como Fernando González, cofundador. Tono humano, sin em-dashes, sin emojis. Siempre "nuestro showroom", nunca el nombre de la plaza como marca.

## 3. Máquina de estados del lead
Estados: NUEVO, CALIENTE, CITADO, COTIZADO, NO_ASISTIO, FRIO, CLIENTE, DESCARTADO.
- NUEVO→CALIENTE: responde con interés. NUEVO→FRIO: 48h sin respuesta tras sus 3 toques.
- CALIENTE→CITADO: agenda. CALIENTE→FRIO: sin respuesta tras 4 toques (7 días).
- CITADO→COTIZADO: asistió y recibió precio. CITADO→NO_ASISTIO: no llegó.
- NO_ASISTIO→CITADO: reagenda. NO_ASISTIO→FRIO: sin respuesta tras cadencia (14 días).
- COTIZADO→FRIO: sin respuesta tras cadencia (14 días).
- FRIO→CALIENTE: responde cualquier mensaje (**REGLA DE ORO: cualquier entrante reactiva al lead y reinicia cadencia**).
- Cualquiera→CLIENTE: compra. Cualquiera→DESCARTADO: rechazo explícito o 90 días en FRIO.

## 4. Cadencias (toques por estado, offset desde el evento)
- NUEVO: T1 inmediato (<15 min), T2 +24h, T3 +48h.
- CALIENTE: T1 inmediato, T2 +1d, T3 +3d, T4 +7d.
- CITADO (anti no-show): T1 al agendar, T2 24h antes (si no confirma: tarea de LLAMAR), T3 mañana del día de la cita.
- NO_ASISTIO: T1 mismo día (+2-4h), T2 +2d, T3 +5d (incentivo: grabado gratis), T4 +14d = FRIO sin mensaje.
- COTIZADO: T1 +1d de la visita, T2 +3d (apartado $1,000 congela precio), T3 +7d (vigencia 15 días + fecha de propuesta), T4 +14d último toque.
- FRIO: T1 día 7, T2 día 15, T3 día 30, T4 día 60, T5 día 90 (después DESCARTADO).
- **Plantillas: 23, en xlsx de Santiago (pestaña CADENCIAS) — pedirlo para el seed.** Placeholders con corchetes: [nombre], [fecha], [hora], [pin], [metal], etc.

## 5. Datos mínimos por lead
nombre, telefono, canal (WA/IG), fecha_primer_contacto, **fecha_propuesta_boda (dato de
calificación #1, siempre capturarlo)**, estado, fecha_ultimo_toque, proximo_toque
(fecha + número), agendo_cita, asistio, compro, notas, source_tag (meta_ads / expo /
referido / organico — las expos también alimentan este pipeline), sucursal_id, flags
de escalamiento.

## 6. Reglas de negocio duras
- **Escalamiento:** 2 quilates+, presupuesto alto o piedra de color importante → notificación inmediata a Santiago y la cadencia automática SE DETIENE para ese lead (lo toma un humano).
- Nunca descuentos directos. Incentivos permitidos solo los de plantilla: grabado gratis, apartado $1,000, precio preferente en set.
- Urgencia solo verificable: vigencia de cotización 15 días (metal/diamante fluctúan) y tiempos de producción vs fecha de propuesta. Nada de urgencia falsa.
- **Un entrante del lead SIEMPRE pausa/reinicia la cadencia. Jamás un toque automático encima de una conversación activa.**

## 7. Métricas del dashboard
% consulta→cita (KPI principal, meta >5%) · % no-show (<25%) · % visita→cierre (>80%) ·
tiempo de primera respuesta (<15 min) · leads por estado, reactivaciones de FRIO,
todo por source_tag y por semana.

## 8. Fases
- **Fase 1 (ahora): semiautomático.** El sistema calcula transiciones y genera tareas diarias ("hoy toca T2 de COTIZADO para Ana López") con mensaje listo para copiar/pegar y marcar enviado. Pipeline/kanban por estado + lista "toques de hoy".
- **Fase 2:** automatizar lo de menor riesgo por Cloud API: T1 de NUEVO y recordatorios de CITADO. COTIZADO y FRIO siguen humanos.
- **Fase 3:** bot conversacional completo de calificación (spec aparte, no diseñar aún).

---

## Anotaciones de ingeniería (Claude Code, 2026-07-11) — leer antes de construir

1. **NO crear tabla `lead` paralela.** `cliente` YA ES el lead (el riel crea la ficha
   al primer mensaje) y ya tiene pipeline, fuente_canal/fuente_detalle (= source_tag),
   citas, cotizaciones y conversación colgando. Duplicar entidad = misma bifurcación
   que evitamos en Expos (ver DECISIONES 0034). Plan: extender el enum/etapa de
   `cliente` para cubrir los 8 estados (mapear con lo existente: p.ej. 'perdido'≈
   DESCARTADO), y tabla nueva `cadencia_toque` (plantillas) + campos de cadencia en
   cliente (estado_cadencia, proximo_toque_at, toque_n, cadencia_pausada).
2. **T1 "inmediato <15 min" YA EXISTE:** es el bot del riel (responde en segundos,
   con delay humanizado). No construir un T1 aparte para leads de WhatsApp.
3. **El cron es diario; los toques con hora (T2 24h-antes-de-cita, NO_ASISTIO +2-4h)
   necesitan un cron por hora** (Vercel cron soporta hourly) o cálculo al vuelo en
   "toques de hoy". Decidir en el diseño.
4. **Ventana de 24 h de Meta:** T2+ de casi todas las cadencias caen FUERA de la
   ventana → en Fase 2 esos toques REQUIEREN plantillas aprobadas por Meta (proceso
   de días). Darlas de alta temprano. En Fase 1 (copiar/pegar manual desde el cel o
   wa.me) la restricción no aplica: es el WhatsApp de la persona… ojo: si se envía
   desde el número de la API vía Inbox, SÍ aplica. Aclarar en diseño.
5. **"Firmar como Fernando González":** ok para toques manuales (los manda él) y
   borradores aprobados. Para mensajes 100% automáticos, la regla actual del bot es
   no afirmar identidad; si un automático va firmado como Fernando, que Fernando
   apruebe la plantilla una vez (es su nombre). Decisión funcional de Santiago/Fer.
6. **Escalamiento 2ct+ ya existe a medias:** el bot marca sensible→borrador. Falta:
   flag en cliente, DETENER cadencia y notificación push (la Notification API del
   widget flotante ya avisa de borradores; push real = mejora).
7. **Métricas:** el funnel de /crecimiento ya calcula consulta→cita→cierre por
   fuente y campaña. El dashboard del spec se construye ENCIMA (agregar % no-show,
   tiempo de primera respuesta y reactivaciones, y varios ya salen).
8. La regla de oro (entrante pausa cadencia) se engancha en `registrarEntrante`
   (inbox-riel.ts): un solo punto por el que entra TODO mensaje.
