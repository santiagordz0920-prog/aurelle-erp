# Módulo: Inbox de WhatsApp (Fase 3 — shell)

> Inbox unificado (§3.1). La ESTRUCTURA + pantalla están listas con datos de
> muestra; el riel vivo (webhook de Meta) se enchufa cuando haya verificación+WABA.

## Estado
Construido en Fase 3 (shell, sin Meta). Última modificación: 2026-07-06. Migración 0018.

## Tablas (migración 0018)
- `conversacion` — RLS por sucursal. cliente_id (nullable), **telefono** (identificador natural, único por sucursal),
  estado (abierta/cerrada), no_leidos, ultimo_at (orden del inbox).
- `mensaje` — RLS vía conversación. direccion (entrante/saliente), tipo (texto/imagen/documento/audio/plantilla),
  cuerpo, media_url, **es_ia** (respuesta redactada por IA), estado_entrega (salientes), **wa_id** (id de Meta, único → dedup), autor_id.

## Rutas / pantallas
- `/clientes/inbox` — lista de conversaciones (nombre/teléfono, último mensaje, no-leídos, hora). Enlace desde `/clientes`.
- `/clientes/inbox/[id]` — hilo (burbujas entrante/saliente, marca IA, hora, estado de entrega) + **responder** con el compositor asistido (wa.me) hasta que el riel envíe por la API.

## Capa de datos
- `src/lib/inbox.ts`: tipos + `horaMensaje` (Monterrey).
- `src/lib/data/inbox.ts`: `listarConversaciones`, `getConversacion` (con mensajes), `totalNoLeidos`.

## Lo que falta para el riel VIVO (necesita Meta)
1. **Webhook receptor** (`/api/webhook/whatsapp`, GET verify + POST): Meta manda cada mensaje entrante → find-or-create `conversacion` por teléfono, **find-or-create `cliente`** (regla §3.1: el teléfono es el identificador; el mensaje crea al cliente), insert `mensaje` entrante, incrementa no_leidos, set ultimo_at. Dedup por `wa_id`. Usa el cliente service_role (sin sesión), protegido por el verify token de Meta.
2. **Envío por Cloud API**: Server Action que POSTea a la Graph API y guarda el `mensaje` saliente con su `wa_id`; actualizar estado_entrega con los webhooks de status.
3. **Marcar leído** al abrir la conversación (hoy no_leidos es estático de muestra).
4. **Bot v2** (calificación + reserva en Citas) + **cola de aprobación** para lo sensible (2ct+, quejas) → `es_ia` + estado pendiente de aprobación.
5. Media (imágenes/certificados) vía Supabase Storage.

## Trampas
- `wa_id` único (índice parcial) = idempotencia: reintentos del webhook de Meta no duplican mensajes.
- El teléfono se normaliza a lada 52 (ver `src/lib/mensajes.ts`) para casar conversación↔cliente.
