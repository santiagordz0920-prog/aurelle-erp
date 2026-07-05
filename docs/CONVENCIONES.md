# CONVENCIONES — cómo se escribe código en este repo

> Establecido en Fase 0. Después cambia rara vez. Todo agente DEBE seguir esto;
> si encuentras algo no definido y recurrente, defínelo aquí en la misma sesión.

## Idioma
- Interfaz, textos, notificaciones y mensajes de commit: español.
- Nombres de tablas y columnas: español, snake_case, singular (`cliente`, `pedido`, `item_inventario`).
- Código (variables, funciones, componentes): inglés estándar; nombres de dominio pueden ser en español si mapean a tablas (`getPedido`). Los helpers de dominio existentes están en español (`areasVisibles`, `getUsuarioActual`) — mantener consistencia por área.

## Stack (Fase 0)
- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript estricto.
- Tailwind CSS v4 (config en CSS con `@theme`, **no** hay `tailwind.config.js`).
- shadcn/ui como base: `cn()` en `src/lib/utils.ts`, variantes con `class-variance-authority`, iconos `lucide-react`. Primitivos propios en `src/components/ui/`.
- Supabase (`@supabase/ssr`): cliente navegador en `src/lib/supabase/client.ts`, cliente servidor (async, con cookies) en `src/lib/supabase/server.ts`.
- Validación de formularios: **zod** (instalado; usar en Fase 1 al capturar datos).

## Estructura de carpetas
```
src/
  app/
    layout.tsx            → raíz: fuente Inter, <html lang="es">, metadata PWA
    page.tsx              → redirige a /hoy
    globals.css           → tokens de diseño Aurelle (@theme)
    (app)/                → grupo autenticado; layout.tsx monta <AppShell>
      hoy/ clientes/ ventas/ taller/ dinero/ crecimiento/ sistema/
  components/
    ui/                   → primitivos shadcn (button, card, …)
    app-shell.tsx         → navegación (sidebar escritorio / tabs móvil)
    empty-state.tsx, page-header.tsx, global-search.tsx, brand-wordmark.tsx
  lib/
    utils.ts (cn)  nav.ts  roles.ts  session.ts  supabase/{client,server}.ts
supabase/
  migrations/             → esquema versionado (ver supabase/README.md)
```
- Una carpeta de ruta por **área de navegación** (§5 del plan), no por tabla. Los sub-módulos (p.ej. cotizaciones y pedidos → Ventas) viven dentro de su área.

## Base de datos
- Toda tabla de negocio: `id uuid default gen_random_uuid()`, `created_at`, `updated_at`, y `sucursal_id` donde aplique.
- `updated_at` se mantiene con `before update` → `public.tocar_updated_at()` (definido en `0001`).
- Migraciones: numeración consecutiva `NNNN_nombre.sql` en `supabase/migrations/`. Nunca cambios manuales en producción.
- **RLS obligatoria** en toda tabla. Helpers de autorización (definidos en `0002`, `SECURITY DEFINER`): `es_admin()`, `rol_actual()`, `sucursal_actual()`.
- **Auditoría**: tablas con datos sensibles adjuntan el trigger genérico `registrar_auditoria()` (definido en `0003`).

### Plantilla de tabla nueva (copiar y adaptar)
```sql
create table public.<tabla> (
  id          uuid primary key default gen_random_uuid(),
  -- … columnas de dominio …
  sucursal_id uuid not null references public.sucursal(id)
                default '00000000-0000-0000-0000-000000000001',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_<tabla>_updated_at
  before update on public.<tabla>
  for each row execute function public.tocar_updated_at();

alter table public.<tabla> enable row level security;
-- Lectura por sucursal del usuario; admin ve todo:
create policy "<tabla>_select" on public.<tabla> for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
-- Escritura: ajustar al rol correcto del módulo (ventas/taller/admin).
create policy "<tabla>_write" on public.<tabla> for all to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());

-- Datos solo-admin (finanzas, márgenes, precios): la policy de SELECT usa
-- únicamente `public.es_admin()`, nunca el rol de sucursal.

create trigger trg_<tabla>_auditoria
  after insert or update or delete on public.<tabla>
  for each row execute function public.registrar_auditoria();
```

## Eventos entre módulos
- Patrón: **TBD Fase 1**. Al implementar el primer evento de la matriz (§4 del plan) decidir triggers de BD vs. lógica en Server Actions y documentar aquí un ejemplo completo. Recomendación inicial: efectos dentro de la misma transacción (p.ej. CxP al vender consignación) como triggers; efectos con I/O externo (WhatsApp, IA) como jobs disparados desde Server Actions / Vercel Cron.

## Componentes UI
- shadcn/ui como base; componente propio reutilizable en `components/` antes de duplicar.
- **Nunca hex sueltos**: usar tokens semánticos de `globals.css` vía clases Tailwind (`bg-primary`, `text-muted-foreground`, `bg-accent-soft`). Paleta: crema fondo, verde bosque primario, dorado acento **escaso**.
- Modo claro únicamente en v1.
- Fuente de interfaz: Inter (`--font-inter`). Las fuentes de marca solo en PDFs server-side.
- **Mobile-first**: diseñar primero para teléfono. Nada tocable < 44px (regla en `globals.css`). Máximo 2–3 toques a cualquier acción frecuente.
- Estados vacíos que enseñan: usar `<EmptyState>` en todo módulo sin datos.

## Calidad
- TypeScript estricto; `npm run build` debe pasar antes de marcar tarea hecha.
- Probar el flujo en móvil (390px) y escritorio antes de dar por terminado (Santiago valida visualmente).
- Commits pequeños, frecuentes, en español.
