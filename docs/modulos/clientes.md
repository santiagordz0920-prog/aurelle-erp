# Módulo: Clientes / CRM v1 (Fase 1)

> CRM v1: ficha 360, captura manual, fuentes, pipeline y notas. WhatsApp (inbox,
> bot), IA y lifecycle son Fases 3/5 y aparecen como pestañas "por venir".

## Estado
Construido en Fase 1. Última modificación: 2026-07-05.

## Tablas (migración 0004)
- `cliente` — nombre, telefono (identificador natural, único cuando existe), fecha_nacimiento, fecha_boda, pareja_nombre, fuente_canal (enum `canal_fuente`: ads/expo/referido/organico) + fuente_detalle libre, referido_por_cliente_id (self-FK) / referido_por_externo, etiquetas (text[]), estado_pipeline (enum), motivo_perdida, sucursal_id. Índices: telefono único parcial, estado, canal, gin(etiquetas), lower(nombre).
- `nota_cliente` — notas internas (invisibles al cliente), con autor_id y timestamp.
- Enums nuevos: `canal_fuente`, `estado_pipeline` (nuevo→conversando→cita_agendada→visito→cotizado→cerrado / perdido).

## Rutas / pantallas
- `/clientes` — lista + tablero de pipeline (toggle `?vista=pipeline`), búsqueda (`?q=`), botón "Nuevo cliente". Todos los roles.
- `/clientes/nuevo` — alta con captura rápida (solo nombre obligatorio).
- `/clientes/[id]` — ficha 360 con pestañas: Resumen, Notas (reales) + Conversación/Citas/Cotizaciones/Pedidos/Media (estados vacíos por fase). Selector de etapa de pipeline arriba.

## Auth (conectado en esta fase)
- `src/lib/session.ts::getUsuarioActual()` ahora lee el usuario real de Supabase y su perfil de `public.usuario`; sin sesión → `/login`.
- `src/middleware.ts` + `src/lib/supabase/middleware.ts` refrescan sesión y protegen rutas.
- `/login` (email+password), `/auth/signout` (POST). Botón de salir en el AppShell.

## Eventos que emite / consume
- Todavía ninguno de la matriz §4 (Citas/Pedidos/Marketing aún no existen). El pipeline se actualiza a mano desde la ficha. Cuando exista Citas, "resultado de cita" moverá el pipeline automáticamente.

## Lógica no obvia / trampas
- **Interruptor local/nube**: `src/lib/supabase/config.ts::supabaseConfigurado()`. Sin llaves (local) la app usa `src/lib/data/clientes-muestra.ts` (5 clientes de ejemplo) y un admin de prueba, para poder ver la UI. Con llaves (producción) todo va a Supabase y arranca vacío. Las escrituras en modo local mutan arrays en memoria (no persisten entre reinicios) — es solo para desarrollo.
- La capa de datos (`src/lib/data/clientes.ts`) es `server-only`. Las mutaciones son Server Actions en `src/app/(app)/clientes/actions.ts` con validación zod (`src/lib/validaciones.ts`).
- RLS: `cliente` y `nota_cliente` filtran por sucursal del usuario (admin ve todo). `nota_cliente` exige `autor_id = auth.uid()` y que el cliente sea visible. Probado en Postgres real (aislamiento por sucursal, teléfono duplicado, suplantación de autor).
- `estado_pipeline = 'perdido'` guarda `motivo_perdida`; los demás lo limpian.

## Pendientes conocidos de este módulo
- Arrastre entre columnas del pipeline (v1 cambia etapa desde la ficha).
- Edición de cliente (hoy solo alta + cambio de etapa + notas).
- Referidos: se guarda `referido_por_*` pero aún no hay UI para capturarlo ni el disparo de agradecimiento/comisión (eso es al cerrar pedido, Fase 1 Pedidos / §3.1).
- Búsqueda por etiqueta/fuente/estado como filtros dedicados (hoy la búsqueda es texto libre sobre nombre/teléfono/fuente/etiquetas).
