# Módulo: Follow-ups / cadencias (Fase 1)

> El motor que asegura que ningún lead muera por falta de seguimiento. Diseño
> completo en `docs/DISENO_FUNNEL_MENSAJES.md` + `docs/SPEC_FOLLOWUPS.md`.
> Esta es la **Fase 1 (semiautomática)**: el sistema calcula qué toca y a quién,
> arma el mensaje listo, y un humano lo manda con un clic (copiar/pegar o wa.me).

## Estado
Construido 2026-07-14 (F1). Migración **0040**. Falta (ver diseño §6, §8):
**simulador de leads (§8)**, Fase 2 (auto-envío de recordatorios de cita +
pieza lista por la Cloud API), Fase 3 (informe semanal del agente + A/B),
tanda 2 de plantillas en Meta, y contenido de los toques INCENTIVO (sesión con
Fer, hoy marcados `pendiente_contenido`).

## Decisión de arquitectura
**NO hay tabla `lead` paralela.** `cliente` YA es el lead (el riel crea la ficha
al primer mensaje). Se le agregaron campos de cadencia; el estado del funnel de
seguimiento (`estado_cadencia`, 8 estados) es distinto de `estado_pipeline` (que
sigue manejando el CRM/funnel de marketing).

## Tablas (0040)
- **`cliente`** (+columnas): `estado_cadencia` (enum, null = fuera de cadencia),
  `cadencia_toque_n`, `proximo_toque_at`, `cadencia_pausada`, `escalado`,
  `fecha_propuesta` (dato de calificación #1), `es_simulacion`.
- **`plantilla_cadencia`** — el texto de cada toque por (estado, toque_n, variante)
  con `offset_horas`, `arquetipo`, `pendiente_contenido`. Editable solo-admin.
  Seed inicial: 21 plantillas en tono Aurelle (placeholders `{nombre} {interes}
  {horario} {fecha}`). El `offset_horas` es acumulado desde que entra al estado.
- **`toque`** — un renglón por envío (bitácora + instrumentación §3): estado,
  toque_n, arquetipo, plantilla, canal, texto_enviado, `respondido_at`
  (atribución automática), `cita_id`, `es_simulacion`. Auditado.

## Rutas / pantallas
- **`/crecimiento/seguimiento`** (solo-admin) — "Toques de hoy" (mensaje listo +
  Copiar / WhatsApp / Marcar enviado / Escalar) + kanban por `estado_cadencia`.
- **`/api/cron/cadencias`** — cron HORARIO (`vercel.json`): re-arma cadencias
  pausadas cuando la conversación se enfría (último mensaje ≥24 h y sin borrador).

## Eventos / lógica no obvia (trampas)
- **Regla de oro (dura):** todo entrante PAUSA la cadencia (`cadencia_pausada`) y
  reactiva frío/no-asistió → caliente. Enganche en `registrarEntrante`
  (`inbox-riel.ts`, paso 5), el único punto por el que entra TODO mensaje. Ahí
  también se **atribuye la respuesta** al último `toque` sin `respondido_at`.
- **Lead nuevo del riel** entra a `estado_cadencia='nuevo'` con `toque_n=1` (el
  bot da T1 inmediato) y próximo toque en 24 h. La regla de oro lo pausa de una
  (el propio mensaje de alta es un entrante); el cron lo reanuda al enfriarse.
- **El motor** vive en `crecimiento/seguimiento/actions.ts` (`programarSiguiente`):
  offsets acumulados → la espera real es el delta entre toques. Al agotarse la
  cadencia de un estado transiciona (`estadoTrasAgotarCadencia`: casi todo → frío;
  frío → descartado). CITADO no se agota por silencio (lo mueve el resultado de
  la cita); sus toques van anclados a la cita (pendiente afinar en F2).
- **Escalamiento** (`escalarLead`): 2ct+/presupuesto alto/piedra importante →
  `escalado=true`, cadencia detenida, lo toma un humano.
- **Fase 1 = copiar/pegar / wa.me** (decisión de Santiago): no se envía desde el
  número de la API, así que NO depende de plantillas aprobadas por Meta todavía.
- Dominio client-safe en `src/lib/cadencias.ts`; datos en `src/lib/data/cadencias.ts`.

## Pendientes conocidos
- **Simulador de leads (§8 del diseño)** — bot vs bot con reloj virtual y asserts;
  los flags `es_simulacion` ya están en el esquema para engancharlo.
- Toques anclados a cita (CITADO T2 24h-antes / T3 día-de) calculados al vuelo.
- Contenido de arquetipos INCENTIVO (sesión con Fer).
- Dashboard de medición (§3) sobre `toque` en `/crecimiento`.
- Verificación: migración 0040 aplicada en Postgres local (cadena 0001–0040) +
  RLS; página renderiza con datos de muestra (toques + kanban). El motor en prod
  corre con supabase (el sandbox no lo alcanza).
