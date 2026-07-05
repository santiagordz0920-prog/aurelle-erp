-- ═══════════════════════════════════════════════════════════════════════════
-- 0007_cotizador — Fase 1
-- Reemplaza Pricer v1. Precios de metal con histórico, cotizaciones por líneas
-- (precio de la PIEZA COMPLETA, nunca por quilate) y margen solo-admin.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.metal as enum ('oro', 'platino', 'paladio', 'plata');
create type public.estado_cotizacion as enum (
  'borrador', 'enviada', 'seguimiento', 'aceptada', 'vencida'
);

-- ── precio_metal (histórico) ────────────────────────────────────────────────
create table public.precio_metal (
  id                 uuid primary key default gen_random_uuid(),
  metal              public.metal not null,
  pureza             text,                 -- '14k', '18k', '950', etc.
  precio_gramo_mxn   numeric(12,2) not null,
  tipo_cambio_usd_mxn numeric(8,4),
  fecha              date not null default current_date,
  fuente             text not null default 'manual',  -- 'manual' | 'api'
  sucursal_id        uuid not null references public.sucursal(id)
                       default '00000000-0000-0000-0000-000000000001',
  created_at         timestamptz not null default now()
);
create index idx_precio_metal_fecha on public.precio_metal (metal, fecha desc);

-- ── cotizacion ──────────────────────────────────────────────────────────────
create table public.cotizacion (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid references public.cliente(id) on delete set null,
  estado        public.estado_cotizacion not null default 'borrador',
  total         numeric(12,2) not null default 0,   -- precio pieza completa
  notas         text,
  valida_hasta  date,
  pdf_url       text,
  pedido_id     uuid,                                -- se llena al convertir (Pedidos)
  sucursal_id   uuid not null references public.sucursal(id)
                  default '00000000-0000-0000-0000-000000000001',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_cotizacion_cliente on public.cotizacion (cliente_id);
create index idx_cotizacion_estado on public.cotizacion (estado);
create trigger trg_cotizacion_updated_at before update on public.cotizacion
  for each row execute function public.tocar_updated_at();

-- ── cotizacion_linea ────────────────────────────────────────────────────────
-- Componentes de la pieza. El precio que cuenta es el total de la cotización;
-- las líneas describen (metal+quilataje, piedra central de inventario o por
-- especificación, laterales, montura).
create table public.cotizacion_linea (
  id                 uuid primary key default gen_random_uuid(),
  cotizacion_id      uuid not null references public.cotizacion(id) on delete cascade,
  descripcion        text not null,
  metal              public.metal,
  quilataje          text,
  item_inventario_id uuid references public.item_inventario(id) on delete set null,
  especificacion     text,               -- si la piedra se va a conseguir
  precio             numeric(12,2) not null default 0,
  orden              int not null default 0,
  created_at         timestamptz not null default now()
);
create index idx_cotizacion_linea_cot on public.cotizacion_linea (cotizacion_id, orden);

-- ── cotizacion_margen (SOLO ADMIN) ──────────────────────────────────────────
-- Costo estimado y por ende el margen; oculto a ventas por RLS (§3.3).
create table public.cotizacion_margen (
  cotizacion_id  uuid primary key references public.cotizacion(id) on delete cascade,
  costo_estimado numeric(12,2) not null default 0,
  updated_at     timestamptz not null default now()
);
create trigger trg_cotizacion_margen_updated_at before update on public.cotizacion_margen
  for each row execute function public.tocar_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.precio_metal enable row level security;
create policy "precio_metal_select" on public.precio_metal for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "precio_metal_write" on public.precio_metal for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

alter table public.cotizacion enable row level security;
create policy "cotizacion_select" on public.cotizacion for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "cotizacion_insert" on public.cotizacion for insert to authenticated
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "cotizacion_update" on public.cotizacion for update to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "cotizacion_delete" on public.cotizacion for delete to authenticated
  using (public.es_admin());

alter table public.cotizacion_linea enable row level security;
create policy "cotizacion_linea_select" on public.cotizacion_linea for select to authenticated
  using (exists (select 1 from public.cotizacion c where c.id = cotizacion_id
    and (public.es_admin() or c.sucursal_id = public.sucursal_actual())));
create policy "cotizacion_linea_write" on public.cotizacion_linea for all to authenticated
  using (exists (select 1 from public.cotizacion c where c.id = cotizacion_id
    and (public.es_admin() or c.sucursal_id = public.sucursal_actual())))
  with check (exists (select 1 from public.cotizacion c where c.id = cotizacion_id
    and (public.es_admin() or c.sucursal_id = public.sucursal_actual())));

alter table public.cotizacion_margen enable row level security;
create policy "cotizacion_margen_admin" on public.cotizacion_margen for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_precio_metal_auditoria after insert or update or delete on public.precio_metal
  for each row execute function public.registrar_auditoria();
create trigger trg_cotizacion_auditoria after insert or update or delete on public.cotizacion
  for each row execute function public.registrar_auditoria();
create trigger trg_cotizacion_margen_auditoria after insert or update or delete on public.cotizacion_margen
  for each row execute function public.registrar_auditoria();
