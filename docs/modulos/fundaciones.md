# Módulo: Fundaciones (Fase 0)

> Lo que EXISTE tras Fase 0. La app + su cascarón + la base de seguridad.

## Estado
Construido en Fase 0. Última modificación: 2026-07-05.

## Tablas
- `sucursal` — catálogo de sucursales. Seed: Ellion con id fijo `00000000-…-0001`. RLS: lectura para todo autenticado, escritura solo admin.
- `usuario` — perfil 1:1 con `auth.users`. Columnas: `nombre`, `rol` (enum `admin|ventas|taller`, default `ventas`), `sucursal_id` (default Ellion), `activo`. RLS: cada quien lee su fila, admin lee/escribe todas.
- `auditoria` — bitácora append-only. `tabla`, `registro_id`, `accion`, `usuario_id`, `datos_antes/despues` (jsonb). RLS: SELECT solo admin; nadie inserta/borra directo (solo el trigger).

## Funciones / helpers de BD
- `tocar_updated_at()` — trigger `before update` para mantener `updated_at` (0001).
- `es_admin()`, `rol_actual()`, `sucursal_actual()` — `SECURITY DEFINER`, base de toda policy (0002).
- `manejar_nuevo_usuario()` — crea el perfil en `public.usuario` al insertarse un `auth.users` (0002).
- `registrar_auditoria()` — trigger genérico de auditoría, se adjunta por tabla (0003).

## Rutas / pantallas
- `/` → redirige a `/hoy`.
- `/hoy` — dashboard: citas de hoy, mensajes por aprobar, tareas, alertas (estados vacíos hasta Fases 1+).
- `/clientes` `/ventas` `/taller` `/sistema` — visibles a todos; estados vacíos que anuncian su fase.
- `/dinero` `/crecimiento` — **solo admin** (guard en página + `soloAdmin` en nav; RLS lo respaldará cuando tengan datos).

## Eventos que emite / consume
- Ninguno todavía. El patrón de eventos de la matriz (§4) se define en Fase 1.

## Lógica no obvia / trampas
- **Auth es un stub**: `src/lib/session.ts::getUsuarioActual()` devuelve un admin fijo ("Santiago") porque aún no hay proyecto Supabase provisionado. Al conectar Supabase Auth, reemplazar el cuerpo por la consulta real (el código está comentado ahí mismo) y añadir middleware de refresco de sesión + página `/login`.
- Tailwind v4 **no** usa `tailwind.config.js`; los tokens viven en `globals.css` bajo `@theme`. Editar colores ahí.
- Los helpers de RLS son `SECURITY DEFINER` a propósito (evitan recursión de RLS al leer `public.usuario`). No quitar ese atributo.
- El trigger de auditoría es `SECURITY DEFINER` para poder escribir en `auditoria` saltando su RLS. Por eso nadie necesita policy de INSERT en `auditoria`.

## Pendientes conocidos de este módulo
- Provisionar Supabase + Vercel y conectar auth real (acciones de Santiago; ver `ESTADO.md` y `supabase/README.md`).
- Middleware de sesión + `/login` — al conectar auth.
- Notificaciones push (PWA): el manifest y theme-color están; falta service worker + suscripción push (se aterriza junto con Citas/CRM en Fase 3, cuando hay qué notificar).
- Búsqueda global (`global-search.tsx`) es el marco visual; conectar a datos en Fase 1.
