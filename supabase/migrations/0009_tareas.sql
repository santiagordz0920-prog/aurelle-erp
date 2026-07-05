-- ═══════════════════════════════════════════════════════════════════════════
-- 0009_tareas — Fase 1
-- Lista de pendientes de los fundadores, conectada a la realidad del negocio
-- (§3.15). v1: tareas manuales + vinculables a una entidad (cliente, pedido,
-- item, cotización). Recurrentes y sugeridas por IA llegan en fases posteriores
-- (el enum `origen` y la columna dejan el gancho listo).
-- ═══════════════════════════════════════════════════════════════════════════

create type public.prioridad_tarea as enum ('baja', 'media', 'alta');
create type public.estado_tarea as enum ('pendiente', 'hecha');
create type public.origen_tarea as enum ('manual', 'sugerida');
-- Entidad a la que se vincula (polimórfica; sin FK porque apunta a varias tablas,
-- algunas de fases futuras). Guardamos tipo + id y resolvemos el enlace en la UI.
create type public.entidad_tarea as enum (
  'cliente', 'pedido', 'cotizacion', 'item_inventario', 'expo', 'proveedor'
);

create table public.tarea (
  id                uuid primary key default gen_random_uuid(),
  titulo            text not null,
  detalle           text,
  responsable_id    uuid references public.usuario(id),
  prioridad         public.prioridad_tarea not null default 'media',
  estado            public.estado_tarea not null default 'pendiente',
  fecha_vencimiento date,
  -- Vínculo opcional a una entidad del negocio (§3.15).
  entidad_tipo      public.entidad_tarea,
  entidad_id        uuid,
  origen            public.origen_tarea not null default 'manual',
  completada_at     timestamptz,
  creada_por        uuid references public.usuario(id),
  sucursal_id       uuid not null references public.sucursal(id)
                      default '00000000-0000-0000-0000-000000000001',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_tarea_responsable on public.tarea (responsable_id, estado);
create index idx_tarea_estado on public.tarea (estado, fecha_vencimiento);
create index idx_tarea_entidad on public.tarea (entidad_tipo, entidad_id);
create index idx_tarea_sucursal on public.tarea (sucursal_id);

create trigger trg_tarea_updated_at before update on public.tarea
  for each row execute function public.tocar_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Tareas no son solo-admin: el equipo comparte pendientes por sucursal.
alter table public.tarea enable row level security;
create policy "tarea_select" on public.tarea for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "tarea_insert" on public.tarea for insert to authenticated
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "tarea_update" on public.tarea for update to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "tarea_delete" on public.tarea for delete to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_tarea_auditoria after insert or update or delete on public.tarea
  for each row execute function public.registrar_auditoria();
