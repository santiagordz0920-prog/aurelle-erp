# Módulo: Bot de WhatsApp con IA (Fase 3/5)

> La capa de IA sobre el riel de WhatsApp (§4, §capa de IA). Al llegar un mensaje
> del cliente, Claude clasifica y redacta una respuesta en tono Aurelle; lo seguro
> se envía solo, lo sensible va a una cola de aprobación humana.

## Estado
Construido 2026-07-08 junto con el riel vivo; **operando en prod desde 2026-07-11**
(prueba de fuego: respondió a un mensaje real). Sin migración (usa `mensaje` de 0018).
Requiere `ANTHROPIC_API_KEY` en Vercel. Si no hay API key, el riel funciona sin
bot (el humano responde desde el Inbox).

## Redacción anti-IA + ritmo humano (2026-07-11, reglas de Fer)
- **Prompt endurecido:** SIEMPRE de tú (nunca usted, aunque el cliente lo use;
  regla de Fer 2026-07-11), longitud espejo del cliente (máx 3 frases), PROHIBIDOS los
  emojis / listas / markdown / muletillas de asistente ("¡Claro!", "Con gusto") /
  lenguaje call-center ("no dudes en", "¿en qué más puedo ayudarte?"); no parafrasear
  al cliente; máx 1 pregunta (o ninguna); no repetir el nombre del cliente; variar
  arranques entre mensajes; espejar registro casual/formal; sin despedidas de carta.
- **CERO emojis** también por código: `sinEmojis()` (RE_EMOJI con
  `\p{Extended_Pictographic}` + FE0F + ZWJ) filtra la salida antes de guardar/enviar.
- **Delay humanizado antes de enviar** (`delayHumanoMs`): 15-30 s en primer contacto
  (hilo sin turnos nuestros), 5-12 s después, aleatorio. Antes del delay se manda
  **leído + "escribiendo..."** (`indicarEscribiendoWa`, typing indicator de Meta,
  dura hasta 25 s). El webhook declara `maxDuration=60` para que quepa en `after()`.
  En caso sensible NO hay typing (no prometer respuesta que tardará en llegar).
- **Anti comodín vago + anti catálogo (2026-07-11, iteración con Fer en prod):**
  prohibido "¿...o algo distinto?" (opciones concretas o pregunta abierta) y el
  lenguaje de folleto ("desde X hasta Y", "contamos con"). El prompt trae una
  sección EJEMPLOS DE TONO (bien/mal, incluye casos reales) como few-shot de
  estilo; se marca "nunca los copies literal" para que no se vuelvan plantilla.
- **Vetos puntuales de vocabulario (iteración en prod):** "te late" y
  coloquialismos de compa ("va que va", "de una") — para invitar: "¿te
  gustaría...?" / "si quieres...", variando. Los vetos nuevos se agregan a esta
  lista conforme Fer/Santiago reporten frases que rechinen.
- **Datos del negocio en el prompt (2026-07-11, tercer caso real de Fer):** el bot
  alucinó "showroom Ellion, en Monterrey" y preguntó "¿por qué zona te queda
  mejor?". Ahora el prompt fija los ÚNICOS hechos afirmables: Plaza Ellion, Av.
  Gómez Morín, San Pedro Garza García ("nuestro showroom en San Pedro", nunca
  "showroom Ellion" ni "Monterrey"), link de Maps fijo que se manda directo al
  preguntar ubicación, horario todos los días 10:00-20:00. Vetado "te acomoda".
- **Propone horarios REALES (migración 0035 + `lib/data/agenda-bot.ts`):** antes
  de llamar a la IA se calculan 2 slots libres (citas agendadas/confirmadas de
  piso_ventas + sugerencias vigentes de otros chats; citas de 60 min, 10:00-19:00
  última, anticipación mínima 3 h) y se inyectan como contexto AGENDA. El esquema
  de salida trae `horario_sugerido` (enum restringido a esos slots o "ninguno");
  si el bot usó uno, `apartarHorario` lo bloquea 24 h para otros chats (unique
  index (sala, inicio) → si dos bots corren a la vez, el segundo pierde el insert
  y el slot; validado en Postgres local). El bot solo PROPONE — no confirma citas
  ni las crea (eso sigue siendo bot v2). Si 0035 no está aplicada en prod, el
  candado entre chats se omite con gracia y lo demás funciona.
- **Ranking de horarios (4º caso de Fer: propuso sábado 7 pm):** los slots libres
  ya no se ofrecen en orden cronológico sino por `puntajeSlot` en `agenda-bot.ts`
  — franjas doradas 11-13 y 16-18, comida (14-15) floja, 7 pm castigada, sábado
  brilla al mediodía y se castiga de noche, domingo un escalón abajo, bonus por
  cercanía en días. La alternativa siempre es de OTRO día. Pesos = constantes
  comentadas, para iterar; cuando haya volumen, calibrar con datos reales
  (resultado de cita por franja). Vetado "aquí la ubicación" (usar "es esta la
  ubicación:" y variantes); horas SIEMPRE am/pm, nunca 24 h ("10 a 20").
- **Identidad:** si preguntan nombre / "¿eres bot?" → sensible=true (responde un
  humano); el bot no lo afirma ni lo niega, y no se inventa nombre.

## Piezas
- `src/lib/ia/anthropic.ts`: cliente Anthropic (`@anthropic-ai/sdk`), `iaConfigurada()`,
  `MODELO_IA` (default `claude-opus-4-8`, override con `ANTHROPIC_MODEL`).
- `src/lib/ia/bot-whatsapp.ts`: `responderConBot(entrada)`. Lee el hilo reciente,
  llama a Claude con **structured output** (esquema `{intencion, sensible, motivo,
  respuesta}`) y system prompt con la persona Aurelle + reglas duras, y decide:
  - **sensible=true** (2ct+, queja, negociación, compromiso de precio/fecha, duda) →
    guarda `respuesta` como borrador (`estado_entrega='borrador_ia'`), NO envía.
  - **sensible=false** → envía por `enviarTextoWa` y guarda el saliente (`es_ia=true`,
    `estado_entrega='enviado'` + `wa_id`).
- Disparo: el webhook llama `responderConBot` dentro de `after()` (tras responder 200).

## Reglas duras (en el system prompt)
- NUNCA da precios, cotizaciones, montos, ni promete fechas/descuentos/condiciones.
- NUNCA inventa disponibilidad de piedras ni características técnicas.
- Ante la duda → sensible=true (lo revisa un humano).
- Tono Aurelle: cálido, sobrio, breve, español MX; una pregunta a la vez; invita a
  agendar visita al showroom cuando tiene sentido.

## Cola de aprobación (§4: 2ct+ → cola humana)
Los borradores (`borrador_ia`) aparecen en el hilo del Inbox como "Respuestas
sugeridas por la IA" con **Aprobar y enviar** / **Descartar**; el humano puede editar
el texto antes de enviar (si edita, se manda como respuesta propia y se descarta el
borrador). Ver `docs/modulos/inbox.md`.

## Decisiones
- Modelo por defecto `claude-opus-4-8` (calidad para trato al cliente); overridable a
  Haiku/Sonnet por costo con `ANTHROPIC_MODEL`.
- Structured output (`output_config.format` json_schema) para clasificar y redactar en
  una sola llamada, sin parseo frágil.
- Se corre en `after()` para no exceder el tiempo del webhook de Meta.

## Pendiente
- **Bot v2**: reservar cita en Citas y precargar cotizador desde la conversación.
- Tono/persona editable por Santiago sin tocar código (hoy el prompt vive en el módulo).
- Notificación push a Santiago cuando entra un caso 2ct+ (hoy solo queda el borrador).
