# Módulo: Clientes / CRM v1 (Fase 1)

> CRM v1: ficha 360, captura manual, fuentes, pipeline y notas. WhatsApp (inbox,
> bot), IA y lifecycle son Fases 3/5 y aparecen como pestañas "por venir".

## Estado
Construido en Fase 1. Última modificación: 2026-07-11 (lista de leads + intake multicanal, 0036).

## Tablas (migración 0004)
- `cliente` — nombre, telefono (identificador natural, único cuando existe), fecha_nacimiento, fecha_boda, pareja_nombre, fuente_canal (enum `canal_fuente`: ads/expo/referido/organico) + fuente_detalle libre, referido_por_cliente_id (self-FK) / referido_por_externo, etiquetas (text[]), estado_pipeline (enum), motivo_perdida, sucursal_id. Índices: telefono único parcial, estado, canal, gin(etiquetas), lower(nombre).
- **0036 (2026-07-11):** + `interes` (qué busca el lead; lo mantiene el bot con cada mensaje), `correo`, `instagram`, `facebook` (Messenger), `otro_contacto`, `contacto_preferido` (check: telefono/correo/instagram/facebook/otro). La migración normaliza teléfonos existentes (sin espacios/guiones, fila por fila con manejo de colisión de duplicados) y backfillea `contacto_preferido='telefono'` donde hay teléfono.

## Lista de leads at-a-glance (feedback de Santiago 2026-07-11)
- `/clientes` (vista lista) ahora es la **lista de leads**: por fila muestra nombre + etiquetas, **qué busca** (`interes`, lo escribe el bot), **contacto principal** con icono, fuente, **última interacción** ("hace 2 h", del `ultimo_at` de la conversación) y blurbs de atención: **"N sin contestar"** (`no_leidos`) y **"Respuesta por aprobar"** (borradores `borrador_ia`).
- **Filtro por etapa**: chips con conteo (`?etapa=`), combinables con la búsqueda.
- **Override manual de etapa en la fila** (`EstadoSelectorMini`): cualquier socio mueve el lead sin entrar a la ficha; "perdido" pide motivo con prompt. La ficha conserva su selector completo.
- Datos: `listarLeads(q, etapa)` en `lib/data/clientes.ts` (clientes + conversación más reciente por cliente + conteo de borradores). En local usa muestras de clientes+inbox.

## Contacto multicanal (intake WhatsApp/IG/Messenger/Expos, 0036)
- **Regla: mínimo UN dato de contacto** (teléfono, correo, Instagram, Messenger u otro). Se valida en zod (`validarContacto`, compartida por alta/edición) — NO con CHECK en BD: hay clientes históricos solo-nombre y un CHECK bloquearía sus updates.
- **`contacto_preferido` = el principal**: es el ÚNICO que muestran las listas; los demás solo quedan registrados en la ficha (Resumen los lista todos y marca "· preferido"). Si no se elige, es el primero con dato (orden: teléfono→correo→IG→FB→otro, `contactoPrincipal()` en `lib/clientes.ts`).
- **Teléfono SIEMPRE sin espacios/guiones** (`normalizarTelefono`): normaliza el zod del alta/edición, el riel de WhatsApp y la captura de expo; 0036 normalizó los existentes. La **búsqueda** de `/clientes` es insensible a espacios: compara solo dígitos cuando el query trae ≥4 dígitos (también busca en correo/instagram).
- Edición: tarjeta **"Datos de contacto"** en la pestaña Resumen de la ficha (`ContactoForm` → `actualizarContacto`). La captura de lead en expo acepta teléfono/correo/otro (mínimo uno).
- **El bot actualiza la ficha**: `interes` con cada mensaje y `nombre` cuando el cliente dice su nombre completo (ver `docs/modulos/bot-ia.md`).
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

## Borrado manual (2026-07-09)
- Botón **Borrar** en la ficha (solo-admin, `EliminarCliente` → `eliminarCliente`) con confirmación. La política RLS `cliente_delete = es_admin()` ya existía (0004): **sin migración**. Guarda: un cliente **con pedidos NO se borra** (RESTRICT en BD + aviso en la acción); marca 'perdido' en ese caso. Citas/notas cascadean; cotización/conversación/media quedan sin liga. Para limpiar clientes de prueba/duplicados.
