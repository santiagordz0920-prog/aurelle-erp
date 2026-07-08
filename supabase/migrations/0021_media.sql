-- ═══════════════════════════════════════════════════════════════════════════
-- 0021_media — Fase 4 · Biblioteca de media (§3.8)
-- Renders (Higgsfield), CADs y fotos, organizados por cliente / pedido / item /
-- orden de producción. Los archivos viven en Supabase Storage (bucket privado
-- `media`); esta tabla es el índice con metadatos, etiquetas y versionado.
--
-- El bucket y las policies de storage.objects se configuran aparte (no en el
-- glob de migraciones, que se valida contra un Postgres sin el esquema storage):
-- ver supabase/storage/media_setup.sql — Santiago lo corre una vez.
--
-- RLS por sucursal (taller y ventas la ven; sin costos ni datos de socio aquí).
-- ═══════════════════════════════════════════════════════════════════════════

create type public.tipo_media as enum (
  'render', 'cad', 'foto_etapa', 'foto_final', 'referencia', 'otro'
);

create table public.media (
  id           uuid primary key default gen_random_uuid(),
  tipo         public.tipo_media not null default 'foto_final',
  storage_path text not null,                 -- ruta dentro del bucket `media`
  nombre       text,                          -- nombre legible / archivo original
  cliente_id   uuid references public.cliente(id) on delete set null,
  pedido_id    uuid references public.pedido(id) on delete set null,
  item_id      uuid references public.item_inventario(id) on delete set null,
  orden_id     uuid references public.orden_produccion(id) on delete set null,
  etapa        public.etapa_produccion,       -- para foto_etapa (qué etapa retrata)
  version      int not null default 1,        -- versionado de renders (v1, v2…)
  aprobado     boolean not null default false,-- render aprobado por el cliente
  etiquetas    text[] not null default '{}',  -- estilo/metal/piedra (galería marketing)
  subido_por   uuid references public.usuario(id),
  sucursal_id  uuid not null references public.sucursal(id)
                 default '00000000-0000-0000-0000-000000000001',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_media_pedido on public.media (pedido_id);
create index idx_media_cliente on public.media (cliente_id);
create index idx_media_orden on public.media (orden_id);
create index idx_media_tipo on public.media (tipo);
create index idx_media_etiquetas on public.media using gin (etiquetas);

create trigger trg_media_updated_at
  before update on public.media
  for each row execute function public.tocar_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.media enable row level security;
create policy "media_select" on public.media for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "media_write" on public.media for all to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_media_auditoria
  after insert or update or delete on public.media
  for each row execute function public.registrar_auditoria();
