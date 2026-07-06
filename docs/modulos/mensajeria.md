# Módulo: Mensajería asistida (Fase 3 — interina)

> Envío de WhatsApp con humano en el control, ANTES del riel oficial de Meta.
> Sin bridges no oficiales (decisión 2026-07-06). Cero riesgo de ban.

## Estado
Construido en Fase 3. Última modificación: 2026-07-06. **Sin migración** (plantillas
hardcodeadas en `src/lib/mensajes.ts`).

## Qué es / qué NO es
- **Es:** plantillas de texto en tono Aurelle + un botón que abre WhatsApp (link `wa.me`)
  con el mensaje pre-llenado; la persona da enviar desde la app normal.
- **NO es:** envío automático por la API (eso es el riel oficial, Fase 3 con Meta) ni las
  "plantillas de Meta" (esas se aprueban aparte para envío proactivo por la Cloud API).

## Rutas / pantallas
- Ficha de cliente → pestaña **Conversación**: selector de plantilla + texto editable + "Abrir en WhatsApp".

## Capa
- `src/lib/mensajes.ts`: `PLANTILLAS_MENSAJE` (bienvenida, seguimiento post-visita, recordatorio de pago,
  confirmar cita, render listo, cumpleaños, aniversario, libre), `telefonoWa()` (normaliza a lada 52),
  `linkWhatsApp(telefono, texto)`.
- `src/components/clientes/enviar-whatsapp.tsx` (client): compositor.

## Lógica no obvia / trampas
- **Sin teléfono → no se puede** (el botón se oculta con aviso).
- `telefonoWa`: si son 10 dígitos asume celular MX y antepone `52`; si ya trae `52` u otra lada, se usa tal cual.
- El texto va URL-encoded en `?text=`. WhatsApp lo abre listo pero **quien envía es la persona**.

## Pendientes / lo que reemplaza el riel oficial
- Inbox de 2 vías (recibir + historial) — llega con el webhook de Meta (Fase 3 con riel vivo).
- Plantillas **editables por Santiago** desde la app (hoy hardcodeadas) — tabla `plantilla_mensaje` a futuro.
- Reusar el compositor en Pedidos (recordatorio de pago) y Citas (confirmación).
