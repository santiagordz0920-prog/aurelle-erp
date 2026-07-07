# Módulo: Mensajería asistida (Fase 3 — interina)

> Envío de WhatsApp con humano en el control, ANTES del riel oficial de Meta.
> Sin bridges no oficiales (decisión 2026-07-06). Cero riesgo de ban.

## Estado
Construido en Fase 3. Última modificación: 2026-07-07. **Sin migración** (plantillas
hardcodeadas en `src/lib/mensajes.ts`). El botón asistido ya está reusado en Pedido
(recordatorio de saldo) y Cita (confirmación).

## Qué es / qué NO es
- **Es:** plantillas de texto en tono Aurelle + un botón que abre WhatsApp (link `wa.me`)
  con el mensaje pre-llenado; la persona da enviar desde la app normal.
- **NO es:** envío automático por la API (eso es el riel oficial, Fase 3 con Meta) ni las
  "plantillas de Meta" (esas se aprueban aparte para envío proactivo por la Cloud API).

## Rutas / pantallas
- Ficha de cliente → pestaña **Conversación**: selector de plantilla + texto editable + "Abrir en WhatsApp".
- **Pedido** (`/ventas/pedidos/[id]`) → plan de pagos: botón "Recordar pago por WhatsApp" cuando hay saldo y el cliente tiene teléfono.
- **Cita** (item de agenda / ficha) → botón "Confirmar" cuando la cita está agendada o confirmada y el cliente tiene teléfono.

## Capa
- `src/lib/mensajes.ts`: `PLANTILLAS_MENSAJE` (bienvenida, seguimiento post-visita, recordatorio de pago,
  confirmar cita, render listo, cumpleaños, aniversario, libre), `telefonoWa()` (normaliza a lada 52),
  `linkWhatsApp(telefono, texto)`.
- `src/components/clientes/enviar-whatsapp.tsx` (client): compositor.
- `src/components/mensajeria/boton-whatsapp.tsx` (client): botón reusable de envío asistido
  (`telefono` + `texto` pre-llenado); se oculta solo si no hay teléfono. Usado en Pedido y Cita.
- Cita expone `cliente_telefono` (join `cliente(nombre, telefono)` en `src/lib/data/citas.ts`).

## Lógica no obvia / trampas
- **Sin teléfono → no se puede** (el botón se oculta con aviso).
- `telefonoWa`: si son 10 dígitos asume celular MX y antepone `52`; si ya trae `52` u otra lada, se usa tal cual.
- El texto va URL-encoded en `?text=`. WhatsApp lo abre listo pero **quien envía es la persona**.

## Pendientes / lo que reemplaza el riel oficial
- Inbox de 2 vías (recibir + historial) — llega con el webhook de Meta (Fase 3 con riel vivo).
- Plantillas **editables por Santiago** desde la app (hoy hardcodeadas) — tabla `plantilla_mensaje` a futuro.
- ~~Reusar el compositor en Pedidos (recordatorio de pago) y Citas (confirmación).~~ Hecho 2026-07-07.
