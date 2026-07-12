# Diseño: Funnel de follow-ups + motor de aprendizaje

> Sesión de diseño con Fer, 2026-07-12. Sustituye al "xlsx de 23 plantillas"
> (nunca existió: era idea por desarrollar). Este documento ES la fuente de
> verdad del funnel de mensajes. Complementa `docs/SPEC_FOLLOWUPS.md` (la
> máquina de estados de Santiago, que sigue vigente) con: el diseño fino de
> los mensajes, la capa de MEDICIÓN y el ciclo de mejora continua.
> Estado: PROPUESTA — pendiente de OK funcional de Fer/Santiago.

## 0. El principio rector (mecánica de WhatsApp que define todo)

**La plantilla NO vende. La plantilla reabre la puerta.** Fuera de la ventana
de 24 h solo se puede enviar plantilla; en cuanto el cliente contesta LO QUE
SEA, se abre ventana nueva y entra el bot con todo el contexto (hilo + ficha
viva + agenda) a conversar libre y llevar hacia la cita. Por eso cada toque
se diseña para UNA sola cosa: provocar una respuesta. El cierre es del bot
(o del humano), nunca del toque.

Corolarios:
- Toques cortos (1-2 frases). Un toque largo que explica todo no deja razón
  para contestar.
- Cada toque de una cadencia debe ser DISTINTO al anterior (arquetipo
  diferente, ver §2): repetir el mismo mensaje con otras palabras se lee
  robótico, y Meta castiga plantillas con mala tasa de respuesta.
- El dato de oro es `fecha_propuesta` (cuándo piensa proponer/casarse): habilita
  la única urgencia honesta que tenemos ("para llegar a septiembre, el taller
  arranca en julio"). El bot debe capturarla con naturalidad (§5).

## 1. Estados y cadencias (mapa completo)

Estados = los del spec de Santiago (extienden `cliente.estado_pipeline`):
NUEVO, CALIENTE, CITADO, COTIZADO, NO_ASISTIO, FRIO, CLIENTE, DESCARTADO.

**REGLA DE ORO (dura, en código):** cualquier mensaje entrante del cliente
PAUSA la cadencia (se cancela el próximo toque programado) y el bot conversa.
Al cerrar la conversación sin avance de estado, la cadencia se REINICIA desde
T1 del estado actual (con offsets nuevos). Jamás un toque automático encima
de una conversación activa. Enganche: `registrarEntrante` (inbox-riel.ts).

**ESCALAMIENTO (duro):** 2 quilates+, presupuesto alto o piedra de color
importante → flag en cliente, cadencia DETENIDA, notificación a Santiago
(widget + push cuando exista). Lo retoma un humano.

Cadencias (toque → offset → arquetipo §2 → canal):

### NUEVO (contactó y no respondió a la primera respuesta nuestra)
- T1 — inmediato — lo hace el BOT (ya existe, texto libre).
- T2 — +24 h — plantilla CONTINUIDAD ("quedé pendiente de ti…").
- T3 — +48 h de T2 — plantilla VALOR o INVITACIÓN directa al showroom.
- Silencio → FRIO.

### CALIENTE (conversó con interés, no agendó)
- T1 — inmediato al enfriarse (24 h sin respuesta) — plantilla CONTINUIDAD
  con el interés específico de la ficha.
- T2 — +2 d — plantilla VALOR (idea/detalle relevante a SU pieza).
- T3 — +4 d — plantilla URGENCIA VERIFICABLE si hay fecha_propuesta; si no,
  INVITACIÓN con horario concreto sugerido.
- T4 — +7 d — plantilla CIERRE SUAVE (walk-away digno).
- Silencio → FRIO.

### CITADO (anti no-show)
- T1 — al agendar — confirmación (bot en ventana; plantilla si ya cerró).
- T2 — 24 h antes — `aurelle_recordatorio_cita_manana` (tanda 1 ✓).
  Sin respuesta a T2 → **tarea sugerida "LLAMAR a confirmar"** (humano).
- T3 — mañana del día — `aurelle_recordatorio_cita_hoy` (tanda 1 ✓).

### NO_ASISTIO
- T1 — mismo día (+2-4 h) — plantilla REAGENDA sin culpa ("hoy no
  coincidimos; ¿buscamos otro momento?").
- T2 — +2 d — plantilla CONTINUIDAD + horario concreto.
- T3 — +5 d — plantilla INCENTIVO (grabado gratis al reagendar).
- T4 — +14 d — pasar a FRIO sin mensaje.

### COTIZADO (visitó, tiene precio, no cierra)
- T1 — +1 d — `aurelle_seguimiento_visita` (tanda 1 ✓).
- T2 — +3 d — plantilla INCENTIVO (apartado $1,000 congela precio).
- T3 — +7 d — plantilla URGENCIA VERIFICABLE (vigencia 15 días de la
  cotización + su fecha si la hay).
- T4 — +14 d — plantilla CIERRE SUAVE. Silencio → FRIO.

### FRIO (reactivación espaciada)
- T1 — día 7 — `aurelle_reactivacion` (tanda 1 ✓, con fallback de interés).
- T2 — día 15 — plantilla VALOR/ÁNGULO NUEVO.
- T3 — día 30 — plantilla FECHA (si hay fecha_propuesta: cuenta atrás del
  taller; si no, estacional).
- T4 — día 60 — plantilla INCENTIVO.
- T5 — día 90 — plantilla DESPEDIDA DIGNA → DESCARTADO.
- Respuesta a CUALQUIERA → CALIENTE (regla de oro).

## 2. Arquetipos de mensaje (la "paleta" de plantillas)

Cada toque usa un arquetipo; nunca dos toques seguidos del mismo. Cada
arquetipo tendrá 2-3 VARIANTES de redacción aprobadas en Meta (rotación
anti-repetición + materia prima del A/B, §4).

1. **CONTINUIDAD** — retoma lo específico hablado (variable desde
   `cliente.interes`). "Quedé pendiente de lo de {{interés}}."
2. **VALOR** — aporta algo antes de pedir: idea, dato del taller, "llegó una
   piedra parecida a lo que buscabas" (enganche futuro con Inventario).
3. **INVITACIÓN** — showroom directo, idealmente con horario concreto
   disponible (reusa `agenda-bot`).
4. **URGENCIA VERIFICABLE** — SOLO la honesta: fecha del cliente vs tiempos
   reales del taller; vigencia de cotización de 15 días. Nada inventado.
5. **INCENTIVO** — solo los 3 permitidos: grabado gratis, apartado $1,000
   congela precio, precio preferente en set. Cada uno en SU fase (grabado→
   NO_ASISTIO/FRIO, apartado→COTIZADO, set→COTIZADO argollas).
6. **CIERRE SUAVE / DESPEDIDA DIGNA** — "no te quiero saturar; aquí quedo
   cuando tú digas." Deja bien parada a la marca y a veces provoca la
   respuesta que nada más logró.

Total plantillas a redactar (tanda 2): ~15 (5 de tanda 1 ya cubren huecos).
Redacción SIEMPRE con el manual de estilo del bot (bot-ia.md).

## 3. Instrumentación (medir TODO desde el día uno)

Tabla nueva **`toque`** (un renglón por envío de cadencia):
- cliente_id, estado_cadencia, toque_n, arquetipo, plantilla + variante,
  canal (plantilla_api / manual), enviado_at, wa_id, sucursal_id.
- **respondido_at** — lo llena `registrarEntrante` con el primer entrante
  posterior del cliente (atribución automática de respuesta).
- **cita_id** — atribución: primera cita creada ≤7 d después de la respuesta.
- **resultado_final** — se materializa después (asistió / cotizó / cerró),
  vía joins con cita/pedido; no se duplica el dato.

Campos de cadencia en `cliente`: estado_cadencia, toque_n, proximo_toque_at,
cadencia_pausada (bool), escalado (bool), fecha_propuesta (date).

Con eso el dashboard (en `/crecimiento`, sección "Mensajes") responde:
- **Por plantilla/variante:** enviados, % respuesta, mediana de tiempo a
  respuesta, % → cita, % → cierre.
- **Por toque:** curva de mortalidad de cada cadencia (¿dónde se mueren los
  leads: T2 de NUEVO o T3 de COTIZADO?). Esta curva es LA foto del funnel.
- **Por franja de envío:** ¿los toques de la mañana responden mejor que los
  de la tarde? (alimenta también el ranking de horarios de cita).
- KPIs del spec: % consulta→cita (meta >5%), % no-show (<25%), tiempo de
  primera respuesta (<15 min, ya lo cumple el bot), reactivaciones de FRIO.

## 4. El ciclo de mejora (los "pointers" del agente)

**Informe semanal automático** (cron domingo por la noche → IA lee la semana
de `toque` + resultados → escribe reporte en `/crecimiento` + tarea sugerida
"Revisar informe de mensajes"):
1. Ranking de plantillas: cuál gana, cuál muere (con números).
2. La curva de mortalidad y SU cambio vs semana anterior.
3. 2-3 hipótesis accionables ("T2 de NUEVO responde 3× mejor antes de la 1 pm";
   "la variante B de reactivación duplica a la A").
4. **Borradores de variantes nuevas listos para aprobar** — redactados por la
   IA con el manual de estilo, para darlos de alta en Meta y entrar al A/B.

**A/B honesto con volumen chico (reglas duras del análisis):**
- Las variantes de un arquetipo rotan aleatorio (50/50).
- NO se declara ganadora sin ≥30 envíos por variante; antes de eso el informe
  dice "aún sin muestra suficiente" (prohibido sobre-leer 5 envíos).
- Un cambio a la vez por fase: si cambiamos texto Y horario del toque en la
  misma semana, no sabremos qué movió la aguja.
- Se retira una variante solo cuando pierde con muestra; la ganadora se queda
  como control de la siguiente retadora.

**Higiene con Meta:** el informe incluye recordatorio de revisar la
calificación de calidad del número; si una plantilla junta bloqueos, se
retira aunque "convierta" (el número vale más que cualquier plantilla).

## 5. Cambios al bot que este diseño exige

- **Capturar `fecha_propuesta` con naturalidad** (dato de calificación #1):
  objetivo del prompt + campo en el structured output → ficha. Nunca
  interrogatorio; una pregunta orgánica cuando fluya ("¿ya tienes fecha en
  mente?").
- Al reabrirse la ventana por respuesta a un toque: el bot ya tiene contexto
  del hilo; agregar al contexto interno QUÉ toque respondió (para hilar:
  si respondió a INCENTIVO de grabado, el bot lo sabe y lo honra).
- Escalamiento 2ct+ formal: flag + detener cadencia (hoy solo va a borrador).

## 6. Fases de construcción (orden propuesto)

- **F1 (siguiente sesión de código):** migraciones (toque + campos de cliente
  + estados) · motor de transiciones y regla de oro · pantalla "Toques de hoy"
  (mensaje listo, botón enviar-por-plantilla si aplica o copiar, marcar hecho)
  · kanban por estado · escalamiento formal. Semiautomático: TODO envío lo
  dispara un humano con un clic.
- **F2:** auto-envío de lo de bajo riesgo: recordatorios de CITADO y
  `pieza_lista` (utility, cero riesgo comercial) + tracking completo. El
  resto sigue con clic humano.
- **F3:** informe semanal del agente + A/B de variantes + tanda 2 de
  plantillas completa en Meta.
- **F4:** auto-envío gradual del resto (fase por fase, conforme el informe
  demuestre que el clic humano no está agregando juicio, igual que la llave
  HORARIOS_REQUIEREN_APROBACION).

## 7. Decisiones funcionales pendientes (Fer/Santiago)

1. ¿OK los tiempos de cadencia de §1? (son los del spec con ajustes finos)
2. ¿OK la asignación de incentivos por fase (§2.5)?
3. F2: ¿de acuerdo en que lo primero auto-enviado sean SOLO recordatorios de
   cita y pieza lista?
4. ¿El "informe semanal" les llega como tarea en /hoy + sección en
   /crecimiento, o también por WhatsApp al número de ustedes?
