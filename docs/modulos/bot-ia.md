# Módulo: Bot de WhatsApp con IA (Fase 3/5)

> La capa de IA sobre el riel de WhatsApp (§4, §capa de IA). Al llegar un mensaje
> del cliente, Claude clasifica y redacta una respuesta en tono Aurelle; lo seguro
> se envía solo, lo sensible va a una cola de aprobación humana.

## Estado
Construido 2026-07-08 junto con el riel vivo. Sin migración (usa `mensaje` de 0018).
Requiere `ANTHROPIC_API_KEY` en Vercel. Build+lint verdes; el flujo completo se
verifica en prod (necesita Meta + API key). Si no hay API key, el riel funciona sin
bot (el humano responde desde el Inbox).

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
