-- ═══════════════════════════════════════════════════════════════════════════
-- APLICAR 0019 + 0020 + 0021 + Storage  —  UN SOLO QUERY
-- Pégalo completo en el SQL Editor de Supabase y córrelo UNA vez.
-- Requisito: la base debe estar en 0018 (0004–0018 ya aplicadas).
-- Todo va en una sola transacción: si algo falla, NO se aplica nada.
--   0019 = Producción (kanban + costos → costo_real)
--   0020 = Documentos (archivado + e-firma)
--   0021 = Biblioteca de media (tabla índice)
--   Storage = bucket privado `media` + policies (aquí sí, porque el editor
--             de Supabase tiene el esquema `storage`)
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────── 0019_produccion ───────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- 0019_produccion — Fase 4
-- El taller de Fer (§3.5): órdenes de producción ligadas a un pedido, kanban de
-- etapas con tiempos, y costos de producción que ALIMENTAN el costo real del
-- pedido (matriz §4: "costos de producción → costo real del pedido suma").
--
-- RLS por sucursal (taller/ventas/admin la ven). Los costos de producción son
-- capturables por el taller (Fer conoce lo que paga al casting), pero el MARGEN
-- sigue solo-admin en pedido_costo: un trigger SECURITY DEFINER recomputa
-- pedido_costo.costo_real = Σ costos de producción del pedido.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.etapa_produccion as enum (
  'diseno', 'cad', 'aprobacion_cliente', 'casting', 'engaste', 'pulido', 'qc', 'listo_entrega'
);
create type public.tipo_costo_prod as enum ('casting', 'engaste', 'material', 'mano_obra', 'otro');

-- ── orden_produccion ─────────────────────────────────────────────────────────
create table public.orden_produccion (
  id               uuid primary key default gen_random_uuid(),
  pedido_id        uuid not null unique references public.pedido(id) on delete cascade,
  etapa            public.etapa_produccion not null default 'diseno',
  responsable_id   uuid references public.usuario(id),
  fecha_compromiso date,
  qc_ok            boolean not null default false,   -- QC completo (candado a listo_entrega)
  notas            text,
  sucursal_id      uuid not null references public.sucursal(id)
                     default '00000000-0000-0000-0000-000000000001',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_orden_etapa on public.orden_produccion (etapa);
create index idx_orden_responsable on public.orden_produccion (responsable_id);

create trigger trg_orden_updated_at before update on public.orden_produccion
  for each row execute function public.tocar_updated_at();

-- ── orden_movimiento (bitácora de etapas → tiempos reales) ──────────────────
create table public.orden_movimiento (
  id           uuid primary key default gen_random_uuid(),
  orden_id     uuid not null references public.orden_produccion(id) on delete cascade,
  etapa_desde  public.etapa_produccion,
  etapa_hasta  public.etapa_produccion not null,
  movido_por   uuid references public.usuario(id),
  created_at   timestamptz not null default now()
);
create index idx_orden_mov on public.orden_movimiento (orden_id, created_at);

-- ── costo_produccion (capturable por taller; alimenta costo_real) ───────────
create table public.costo_produccion (
  id          uuid primary key default gen_random_uuid(),
  orden_id    uuid not null references public.orden_produccion(id) on delete cascade,
  tipo        public.tipo_costo_prod not null default 'otro',
  concepto    text not null,
  monto       numeric(12,2) not null check (monto >= 0),
  registrado_por uuid references public.usuario(id),
  created_at  timestamptz not null default now()
);
create index idx_costo_prod_orden on public.costo_produccion (orden_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.orden_produccion enable row level security;
create policy "orden_select" on public.orden_produccion for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "orden_write" on public.orden_produccion for all to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());

alter table public.orden_movimiento enable row level security;
create policy "orden_mov_all" on public.orden_movimiento for all to authenticated
  using (exists (select 1 from public.orden_produccion o where o.id = orden_id
    and (public.es_admin() or o.sucursal_id = public.sucursal_actual())))
  with check (exists (select 1 from public.orden_produccion o where o.id = orden_id
    and (public.es_admin() or o.sucursal_id = public.sucursal_actual())));

alter table public.costo_produccion enable row level security;
create policy "costo_prod_all" on public.costo_produccion for all to authenticated
  using (exists (select 1 from public.orden_produccion o where o.id = orden_id
    and (public.es_admin() or o.sucursal_id = public.sucursal_actual())))
  with check (exists (select 1 from public.orden_produccion o where o.id = orden_id
    and (public.es_admin() or o.sucursal_id = public.sucursal_actual())));

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_orden_auditoria after insert or update or delete on public.orden_produccion
  for each row execute function public.registrar_auditoria();
create trigger trg_costo_prod_auditoria after insert or update or delete on public.costo_produccion
  for each row execute function public.registrar_auditoria();

-- ── Evento: costo de producción → costo_real del pedido (solo-admin) ────────
-- SECURITY DEFINER: el taller captura el costo pero pedido_costo es solo-admin.
-- Recompute robusto: costo_real = Σ de todos los costos de producción del pedido.
create or replace function public.sumar_costo_produccion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_orden  uuid := coalesce(new.orden_id, old.orden_id);
  v_pedido uuid;
  v_sum    numeric(12,2);
begin
  select pedido_id into v_pedido from public.orden_produccion where id = v_orden;
  if v_pedido is null then return coalesce(new, old); end if;
  select coalesce(sum(cp.monto), 0) into v_sum
    from public.costo_produccion cp
    join public.orden_produccion op on op.id = cp.orden_id
    where op.pedido_id = v_pedido;
  insert into public.pedido_costo (pedido_id, costo_real)
    values (v_pedido, v_sum)
    on conflict (pedido_id) do update set costo_real = excluded.costo_real;
  return coalesce(new, old);
end $$;

create trigger trg_costo_prod_suma
  after insert or update or delete on public.costo_produccion
  for each row execute function public.sumar_costo_produccion();

-- ─────────────────────────── 0020_documentos ───────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- 0020_documentos — Fase 4
-- Archivado + e-firma de documentos (§3.12). El contrato/nota se genera desde el
-- pedido; aquí se PERSISTE el documento para archivarlo en la ficha, versionarlo
-- y capturar la firma del cliente con evidencia (firma simple: nombre + fecha/
-- hora + user-agent; el trazo en canvas es una mejora posterior).
--
-- Firma pública: el cliente abre /firmar/[token] SIN cuenta. El token es la
-- llave. Esa ruta lee/escribe con el cliente service_role (bypassa RLS por
-- token); por eso la RLS de la tabla es solo para el equipo (sucursal).
-- ═══════════════════════════════════════════════════════════════════════════

create type public.tipo_documento as enum ('contrato', 'nota_remision', 'adenda');
create type public.estado_documento as enum ('borrador', 'enviado', 'firmado', 'cancelado');

create table public.documento (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references public.pedido(id) on delete cascade,
  tipo           public.tipo_documento not null default 'contrato',
  token          text not null unique,             -- llave de la liga de firma
  estado         public.estado_documento not null default 'borrador',
  version        int not null default 1,
  firmado_por    text,                             -- nombre que firmó
  firmado_at     timestamptz,
  evidencia      jsonb,                            -- {user_agent, ...}
  sucursal_id    uuid not null references public.sucursal(id)
                   default '00000000-0000-0000-0000-000000000001',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_documento_pedido on public.documento (pedido_id, created_at desc);
create index idx_documento_estado on public.documento (estado);

create trigger trg_documento_updated_at before update on public.documento
  for each row execute function public.tocar_updated_at();

-- ── RLS: el equipo por sucursal. La firma pública NO usa estas policies:
--     va por service_role (admin client) validando el token. ─────────────────
alter table public.documento enable row level security;
create policy "documento_select" on public.documento for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "documento_write" on public.documento for all to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_documento_auditoria after insert or update or delete on public.documento
  for each row execute function public.registrar_auditoria();

-- ─────────────────────────── 0021_media ────────────────────────────────
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

-- ─────────────── Storage: bucket privado media + policies ───────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- Storage · bucket `media` (Biblioteca de media, §3.8)
-- Correr UNA vez en el SQL Editor de Supabase (NO va en el glob de migraciones
-- porque toca el esquema `storage`, que el Postgres local de validación no tiene).
--
-- Bucket PRIVADO: los archivos no son públicos; la app genera URLs firmadas de
-- corta vida para mostrarlos/compartirlos. Así una foto de una pieza de un
-- cliente no queda expuesta en una URL adivinable.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Bucket privado.
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

-- 2) Policies sobre storage.objects para el bucket `media`.
--    Sólo usuarios autenticados; la partición por sucursal se maneja en la
--    tabla public.media (índice con metadatos). El acceso al archivo va por URL
--    firmada generada en el servidor, así que basta con exigir sesión.

drop policy if exists "media_leer" on storage.objects;
create policy "media_leer" on storage.objects for select to authenticated
  using (bucket_id = 'media');

drop policy if exists "media_subir" on storage.objects;
create policy "media_subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'media');

drop policy if exists "media_borrar" on storage.objects;
create policy "media_borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'media');

commit;
