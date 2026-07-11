# Módulo: Inbox de WhatsApp (Fase 3 — riel vivo)

> Inbox unificado (§3.1) con el riel OFICIAL de Meta: webhook receptor, envío por
> Cloud API, y bot con IA (redacta y responde; cola de aprobación para lo sensible).

## Estado
Construido en Fase 3. Shell (0018, 2026-07-06) + **riel vivo 2026-07-08** + **EN
PRODUCCIÓN REAL desde 2026-07-11** (Meta verificó el negocio, app publicada, env
vars en Vercel; prueba de fuego pasada: mensaje real → ficha sola → bot respondió).
**2026-07-11:** widget flotante global (`InboxFlotante`) + `/api/inbox/resumen`.
Sin migración nueva (el estado `borrador_ia` vive en `mensaje.estado_entrega`).

## Tablas (migración 0018)
- `conversacion` — RLS por sucursal. cliente_id (nullable), **telefono** (identificador natural, único por sucursal),
  estado (abierta/cerrada), no_leidos, ultimo_at (orden del inbox).
- `mensaje` — RLS vía conversación. direccion (entrante/saliente), tipo (texto/imagen/documento/audio/plantilla),
  cuerpo, media_url, **es_ia** (respuesta redactada por IA), estado_entrega (salientes), **wa_id** (id de Meta, único → dedup), autor_id.

## Rutas / pantallas
- `/clientes/inbox` — lista de conversaciones (nombre/teléfono, último mensaje, no-leídos, hora). Enlace desde `/clientes`.
- `/clientes/inbox/[id]` — hilo (burbujas entrante/saliente, marca IA, hora, estado de entrega) + **responder** con el compositor asistido (wa.me) hasta que el riel envíe por la API.
- **Widget flotante global** (`components/inbox/inbox-flotante.tsx`, montado en `AppShell`): burbuja fija abajo-derecha en TODA la app con badge de pendientes (no leídos + borradores por aprobar), panel con las conversaciones que necesitan atención y liga al hilo. Sondea `/api/inbox/resumen` cada 25 s + al volver a la pestaña; Notification API del navegador si hay permiso (pide permiso al primer clic). Oculto dentro del hilo. Mobile: `bottom-20` para librar los tabs.
- **`/api/inbox/resumen`** (route handler autenticado, RLS): conversaciones con `no_leidos>0` o con `borrador_ia` pendiente + total de pendientes.

## Refresco automático
`AutoRefresh` (`components/inbox/auto-refresh.tsx`): `router.refresh()` periódico
con la pestaña visible + al volver a ella — hilo cada 5 s, lista cada 10 s. No es
reload: conserva scroll y texto a medio escribir. Si algún día 5 s sabe a poco,
el siguiente paso es Supabase Realtime (decisión ya anotada: polling primero).

## Capa de datos
- `src/lib/inbox.ts`: tipos + `horaMensaje` (Monterrey).
- `src/lib/data/inbox.ts`: `listarConversaciones`, `getConversacion` (con mensajes), `totalNoLeidos`.

## Riel vivo (2026-07-08) — piezas
1. **Webhook receptor** `src/app/api/webhook/whatsapp/route.ts` (**público**, en el middleware): GET verify (handshake `hub.verify_token` vs `WHATSAPP_VERIFY_TOKEN`) + POST (valida firma `X-Hub-Signature-256` con `WHATSAPP_APP_SECRET`, aplana el payload, guarda entrantes, actualiza estados de salientes). Responde 200 SIEMPRE y rápido; el bot corre en `after()`.
2. **`src/lib/whatsapp.ts`**: `enviarTextoWa`, `enviarPlantillaWa`, `marcarLeidoWa`, `firmaWebhookValida`, `parsearWebhook`, `whatsappConfigurado`.
3. **`src/lib/data/inbox-riel.ts`** (service_role): `registrarEntrante` (dedup por `wa_id` → find-or-create `cliente` por últimos 10 dígitos → find-or-create `conversacion` → insert entrante → no_leidos++/ultimo_at) y `actualizarEstadoSaliente`.
4. **Bot con IA** (`src/lib/ia/`): ver `docs/modulos/bot-ia.md`. Sensible → borrador (`estado_entrega='borrador_ia'`, no se envía); seguro → envía por API.
5. **Acciones del Inbox** (`clientes/inbox/actions.ts`): `responderInbox` (envía por API), `aprobarBorrador`/`descartarBorrador` (cola de aprobación), `marcarLeido`. Componentes `inbox/responder-inbox`, `inbox/borrador-ia`, `inbox/marcar-leido`. El hilo usa el compositor por API si `whatsappConfigurado()`, si no cae al asistido (wa.me).

## Pendiente
- **Bot v2**: reservar cita real en Citas desde la conversación (hoy invita a agendar; no crea el registro).
- Media entrante (imágenes/certificados) → Supabase Storage (hoy se guarda el mensaje sin bajar el binario).
- Plantillas de Meta pre-aprobadas para escribir FUERA de la ventana de 24 h (`enviarPlantillaWa` ya existe; falta dar de alta las plantillas en Meta y cablearlas a los avisos).

## Trampas
- `wa_id` único (índice parcial) = idempotencia: reintentos del webhook de Meta no duplican mensajes.
- El teléfono se casa por **últimos 10 dígitos** (Meta manda `5218112345678`; el cliente puede tener `8112345678`).
- **Ventana de 24 h de Meta:** texto libre solo dentro de 24 h del último mensaje del cliente; fuera de ella se necesita plantilla aprobada. El bot responde a un entrante → siempre dentro de la ventana.
- El webhook responde 200 y procesa el bot en `after()` (Next) para no exceder el tiempo de Meta.
