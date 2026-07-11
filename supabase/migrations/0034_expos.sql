-- ═══════════════════════════════════════════════════════════════════════════
-- 0034_expos — Fase 6 (Expos, §3.14)
-- Calendario de expos con estado y costos + ROI por evento. Los leads capturados
-- en el stand entran al CRM como `cliente` con fuente_canal='expo' y
-- fuente_detalle = <nombre de la expo>, así el ROI (leads→visitas→cierres) se
-- calcula casando `cliente.fuente_detalle` con `expo.nombre` (mismo patrón que el
-- funnel por campaña, 0029/v2). RLS por sucursal.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.estado_expo as enum ('candidata', 'contratada', 'ejecutada', 'cancelada');

create table public.expo (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  ciudad       text,
  fecha_inicio date,
  fecha_fin    date,
  estado       public.estado_expo not null default 'candidata',
  costo        numeric(12,2) not null default 0 check (costo >= 0),  -- stand+viáticos+material
  contacto     text,                 -- organizador (nombre/teléfono/correo, texto libre)
  notas        text,
  sucursal_id  uuid not null references public.sucursal(id)
                 default '00000000-0000-0000-0000-000000000001',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_expo_estado on public.expo (estado);
create index idx_expo_fecha on public.expo (fecha_inicio);

create trigger trg_expo_updated_at before update on public.expo
  for each row execute function public.tocar_updated_at();

alter table public.expo enable row level security;
create policy "expo_select" on public.expo for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "expo_write" on public.expo for all to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());

create trigger trg_expo_auditoria
  after insert or update or delete on public.expo
  for each row execute function public.registrar_auditoria();
