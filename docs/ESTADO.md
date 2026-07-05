# ESTADO — ERP Aurelle

> Bastón de relevo entre sesiones. Se SOBREESCRIBE (no se acumula). Máx. ~1 página.
> Última actualización: 2026-07-05 por sesión de Fase 1 (Clientes) (Claude Code).

## Fase actual
Fase 1 — Núcleo comercial. Hecho: auth real + Clientes v1. Pendiente: Inventario, Cotizador, Pedidos, Tareas v1, Dashboard v1.

## Hecho
- **Fase 0** completa: app Next 16 + Tailwind v4, sistema de diseño Aurelle, cascarón de navegación (7 áreas), base de datos con roles + RLS + auditoría (migraciones 0001–0003, probadas en Postgres). Provisionado por Santiago: Supabase + Vercel arriba, esquema 0001–0003 aplicado.
- **Auth real** (Fase 1): `/login` (email+password), middleware de sesión, `getUsuarioActual()` lee perfil de `public.usuario`, botón de salir. En local sin llaves cae a admin de prueba.
- **Clientes v1** (migración 0004 + UI): tabla `cliente` + `nota_cliente`, enums de fuente y pipeline, RLS por sucursal (probada en Postgres: aislamiento, teléfono único, anti-suplantación de notas). Pantallas: lista, tablero de pipeline, alta rápida, ficha 360 con pestañas, notas internas. Búsqueda global conectada a clientes. Verificado con capturas (escritorio + móvil).

## En progreso
- Nada activo.

## Siguiente tarea exacta
**Acción de Santiago (para activar Clientes en producción):** en el SQL Editor de Supabase, correr el archivo `aurelle_fase1_clientes.sql` (migración 0004 + asegurar admins). Luego crear su usuario y el de Fer en Authentication si no lo ha hecho, y correr el bloque de admin con los correos reales. Vercel redeploya solo al hacer push.

**Siguiente tarea de código:** continuar Fase 1 con **Inventario** (§3.6 y Fase 1 en §6): SKUs con fotos y certificado IGI, tipos (piedra/diamante/montura/pieza/churumbela), propiedad propio/consignación con consignante, ubicaciones, estados disponible/reservado/consumido, alertas de stock. Es lo que alimenta al Cotizador (piedras + costos) y a Pedidos (reservas). Datos solo-admin: costos.

**Secciones del plan a leer:** §3.6 (Inventario) y Fase 1 en §6. Al construir, seguir el patrón de datos/acciones de `docs/CONVENCIONES.md` y la plantilla de tabla+RLS.

## Problemas conocidos / bloqueos
- El sandbox de Claude no alcanza el Supabase/Vercel de Santiago (política de red). Verificación: migraciones/RLS en Postgres local + capturas de UI; Santiago valida en su deploy. No bloquea.
- Migración 0004 aún por aplicar en el Supabase de producción (ver "Acción de Santiago").
- Pendientes menores de Clientes: editar cliente, arrastre en pipeline, UI de referidos, filtros por etiqueta/estado. Registrados en `docs/modulos/clientes.md`.
- WhatsApp §7.1 y Meta Business: sin cambios; se necesitan para Fase 3.

## Notas para la siguiente sesión
- Probar migraciones en Postgres local: usuario `postgres` (no root) desde `/var/tmp`; stub de `auth` (users + `auth.uid()` vía GUC) + roles `authenticated/anon`. Aplicar 0001→0004 en orden.
- Para capturas: `npm run build` + `npm run start` sin llaves de Supabase (usa datos de muestra), Playwright con `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- Santiago valida visualmente: mostrar capturas (escritorio 1280 + móvil 390) y esperar su OK.
