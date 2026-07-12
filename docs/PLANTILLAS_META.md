# Plantillas de WhatsApp (Meta) — fuente de verdad

> Plantillas pre-aprobadas para escribir FUERA de la ventana de 24 h (recordatorios,
> seguimientos, reactivación). Redactadas con el manual de estilo del bot
> (`docs/modulos/bot-ia.md`): tuteo, sin emojis, sin lenguaje de call center, sin
> "te acomoda"/"te late", horas en am/pm, "nuestro showroom en San Pedro".
> Idioma: **es_MX**. Estado: redactadas 2026-07-12, PENDIENTES de alta en Meta
> (las sube Fer vía sesión de Cowork). Al aprobarse, cablear con
> `enviarPlantillaWa` (ya existe en `src/lib/whatsapp.ts`).

WABA (cuenta de WhatsApp Business): **1036606162209069** ("Aurelle & Co.")

## Tanda 1

### 1. `aurelle_recordatorio_cita_manana` — UTILITY
Uso: T2 de la cadencia CITADO (24 h antes de la cita).
```
Hola {{1}}, te escribo de Aurelle para confirmar tu visita de mañana {{2}} a las {{3}}. Te esperamos en nuestro showroom en San Pedro.
```
*(v2 de Fer 2026-07-12: fuera "¿sigue en pie?" — débil; el cierre afirma, no pregunta.)*
Ejemplos para el alta: {{1}}=Ana · {{2}}=sábado 18 de julio · {{3}}=5:00 pm

### 2. `aurelle_recordatorio_cita_hoy` — UTILITY
Uso: T3 de CITADO (la mañana del día de la cita).
```
Hola {{1}}, ya está todo listo para tu visita de hoy a las {{2}}. Nos vemos en el showroom.
```
*(v2 de Fer: fuera "si se te complica..." — no darle al cliente la salida en bandeja.)*
Ejemplos: {{1}}=Ana · {{2}}=5:00 pm

### 3. `aurelle_pieza_lista` — UTILITY
Uso: QC completo → avisar que la pieza está lista para entrega.
```
Hola {{1}}, buenas noticias: tu {{2}} ya está lista. ¿Qué día te gustaría pasar a recogerla?
```
Ejemplos: {{1}}=Ana · {{2}}=anillo de compromiso

### 4. `aurelle_seguimiento_visita` — MARKETING
Uso: T1 de COTIZADO (+1 día de la visita al showroom).
```
Hola {{1}}, gracias por venir al showroom. Quedé de ayudarte con {{2}}. ¿Cómo lo ves? Cualquier duda me escribes por aquí.
```
Ejemplos: {{1}}=Ana · {{2}}=la cotización del solitario en oro blanco

### 5. `aurelle_reactivacion` — MARKETING
Uso: cadencia FRIO (reactivación suave, sin presión).
```
Hola {{1}}, hace unos días platicamos sobre {{2}}. Si sigues con la idea, lo retomamos cuando tú digas.
```
Ejemplos: {{1}}=Ana · {{2}}=un anillo de compromiso con diamante ovalado
**Regla de llenado de {{2}} (Fer 2026-07-12):** sale de `cliente.interes` (la ficha
viva que mantiene el bot). Si el interés no está claro o está vacío, el fallback
fijo es **"lo que estás buscando"** ("...platicamos sobre lo que estás buscando.
Si sigues con la idea..."), que lee natural sin inventar la pieza. NUNCA adivinar
el tipo de pieza.

## Reglas para futuras plantillas
- Nombre siempre `aurelle_<uso>` en minúsculas con guiones bajos; idioma es_MX.
- UTILITY para lo transaccional del propio cliente (su cita, su pieza, su pago);
  MARKETING para seguimiento/reactivación. Ante la duda, MARKETING (si Meta
  recategoriza, no rechaza).
- Mismo manual de estilo del bot. Nada de urgencia falsa; incentivos solo los
  permitidos del spec (grabado gratis, apartado, precio preferente en set).
- v2 pendiente: variantes de redacción por plantilla (rotación anti-repetición)
  y botones de respuesta rápida ("Confirmo" / "Reagendar") en los recordatorios.
- **Pendiente de diseño (Fer 2026-07-12): el funnel COMPLETO de mensajes** — qué
  pasa cuando el cliente NO contesta una plantilla en cada fase (cada toque
  posterior fuera de ventana necesita SU plantilla; una sola por fase no
  alcanza para cadencias de 3-4 toques). Se diseña junto con el módulo de
  follow-ups (docs/SPEC_FOLLOWUPS.md) usando el xlsx de 23 plantillas de
  Santiago como base de la tanda 2.
