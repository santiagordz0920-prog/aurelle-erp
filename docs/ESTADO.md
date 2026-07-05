# ESTADO — ERP Aurelle

> Bastón de relevo entre sesiones. Se SOBREESCRIBE (no se acumula). Máx. ~1 página.
> Última actualización: 2026-07-05 por sesión de arranque (Claude Code).

## Fase actual
Fase 0 — Fundaciones (en progreso; cascarón y base de seguridad listos, falta provisionar la nube).

## Hecho
- Kit de documentación instalado (`CLAUDE.md` + `docs/`).
- App Next.js 16 + React 19 + TS + Tailwind v4 que compila (`npm run build` ✓).
- Sistema de diseño Aurelle: tokens crema/bosque/dorado en `globals.css`, fuente Inter, primitivos `ui/` (button, card), `EmptyState`, `PageHeader`.
- Cascarón de navegación (`AppShell`): sidebar en escritorio, tabs abajo en móvil, búsqueda global (marco), 7 áreas del §5 con gating `soloAdmin` para Dinero y Crecimiento. Mobile-first. Verificado con capturas en 1280px y 390px.
- Pantalla "Hoy" (dashboard con estados vacíos) + páginas de las 7 áreas anunciando su fase.
- Clientes Supabase (browser/server) y `.env.example`.
- **Base de datos (migraciones `0001`–`0003`)**: `sucursal` (seed Ellion), `usuario`+enum `rol`, helpers `es_admin/rol_actual/sucursal_actual`, alta automática de perfil, `auditoria` + trigger genérico. **RLS probada** sobre Postgres 16 real: un rol `ventas` no puede leer otros perfiles ni la auditoría; admin ve todo; la auditoría capturó inserts/updates.

## En progreso
- Nada activo. Fase 0 lista salvo la provisión de nube (bloqueo externo, ver abajo).

## Siguiente tarea exacta
**Bloqueo para Santiago (acciones fuera del código, ver `supabase/README.md`):**
1. Crear proyecto Supabase + proyecto Vercel; conectar el repo a Vercel.
2. `supabase link` + `supabase db push` (aplica las 3 migraciones).
3. Poner llaves en `.env.local` y en Vercel (ver `.env.example`).
4. Crear usuarios de Santiago y Fer en Auth y promoverlos a `admin`.
5. Decir "listo" para que la siguiente sesión conecte el auth real.

**Primera tarea de código de la siguiente sesión (cuando la nube esté lista):**
- Conectar auth real: reemplazar el stub de `src/lib/session.ts::getUsuarioActual()` por la consulta a Supabase, añadir middleware de refresco de sesión y página `/login`. Luego arrancar **Fase 1 → Clientes v1** (ficha, captura manual, fuentes).

**Secciones del plan a leer para la siguiente tarea:** §3.1 (CRM) y Fase 1 en §6.

## Problemas conocidos / bloqueos
- Auth es un STUB (admin fijo "Santiago") hasta provisionar Supabase — ver `docs/modulos/fundaciones.md`.
- Decisión pendiente: número de WhatsApp (plan §7.1) — no bloquea Fases 0–2.
- Verificación de Meta Business sin iniciar — iniciar en paralelo, se necesita para Fase 3.

## Notas para la siguiente sesión
- Santiago valida visualmente: al terminar algo visible, muéstralo (captura desktop 1280 + móvil 390) y espera su OK.
- Postgres local para probar migraciones: correr como usuario `postgres` (no root) desde `/var/tmp`. Stub de `auth` (users + `auth.uid()` vía GUC) necesario para verificar RLS localmente.
