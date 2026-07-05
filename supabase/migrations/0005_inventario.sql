-- ═══════════════════════════════════════════════════════════════════════════
-- 0005_inventario — Fase 1
-- Reemplaza la Sheet Inventario. Cada piedra/montura/pieza con su historia.
-- COSTOS en tabla aparte (item_costo) con RLS solo-admin: ventas/taller no los
-- pueden leer ni siquiera desde la base (§3.6, §3.17).
-- ═══════════════════════════════════════════════════════════════════════════

create type public.tipo_item as enum (
  'piedra_color', 'diamante', 'montura', 'pieza_terminada', 'churumbela'
);
create type public.propiedad_item as enum ('propio', 'consignacion');
create type public.estado_item as enum (
  'disponible', 'reservado', 'consumido', 'vendido', 'devuelto'
);

-- ── consignante ─────────────────────────────────────────────────────────────
-- Dueños de piezas en consignación (A1–A27 y futuros). En Fase 2 se relacionan
-- con Proveedores y CxP; aquí es un directorio ligero.
create table public.consignante (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  contacto      text,
  condiciones_liquidacion text,
  sucursal_id   uuid not null references public.sucursal(id)
                  default '00000000-0000-0000-0000-000000000001',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_consignante_updated_at before update on public.consignante
  for each row execute function public.tocar_updated_at();

-- ── item_inventario ─────────────────────────────────────────────────────────
create table public.item_inventario (
  id              uuid primary key default gen_random_uuid(),
  sku             text not null,
  tipo            public.tipo_item not null,
  nombre          text not null,
  descripcion     text,
  -- 4Cs (para diamante / piedra de color; nulos en montura/pieza)
  quilates        numeric(6,2),
  color           text,
  claridad        text,
  corte           text,
  propiedad       public.propiedad_item not null default 'propio',
  consignante_id  uuid references public.consignante(id) on delete set null,
  ubicacion       text,               -- "Vitrina 3", "Taller", "Con consignante"
  estado          public.estado_item not null default 'disponible',
  foto_url        text,
  certificado_url text,               -- IGI (PDF/imagen)
  -- Cuando el item queda reservado/consumido por un pedido (Pedidos, 0007):
  pedido_id       uuid,
  sucursal_id     uuid not null references public.sucursal(id)
                    default '00000000-0000-0000-0000-000000000001',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index uq_item_sku on public.item_inventario (sucursal_id, sku);
create index idx_item_tipo on public.item_inventario (tipo);
create index idx_item_estado on public.item_inventario (estado);
create index idx_item_sucursal on public.item_inventario (sucursal_id);
create index idx_item_consignante on public.item_inventario (consignante_id);

create trigger trg_item_updated_at before update on public.item_inventario
  for each row execute function public.tocar_updated_at();

-- ── item_costo (SOLO ADMIN) ─────────────────────────────────────────────────
-- El costo vive separado del item para poder ocultarlo por completo a roles no
-- admin vía RLS. 1:1 con item_inventario.
create table public.item_costo (
  item_id     uuid primary key references public.item_inventario(id) on delete cascade,
  costo       numeric(12,2) not null default 0,
  moneda      text not null default 'MXN',
  updated_at  timestamptz not null default now()
);
create trigger trg_item_costo_updated_at before update on public.item_costo
  for each row execute function public.tocar_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.consignante enable row level security;
create policy "consignante_select" on public.consignante for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "consignante_write" on public.consignante for all to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());

alter table public.item_inventario enable row level security;
create policy "item_select" on public.item_inventario for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "item_insert" on public.item_inventario for insert to authenticated
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "item_update" on public.item_inventario for update to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "item_delete" on public.item_inventario for delete to authenticated
  using (public.es_admin());

-- Costos: SOLO admin, en todas las operaciones.
alter table public.item_costo enable row level security;
create policy "item_costo_admin" on public.item_costo for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_item_auditoria
  after insert or update or delete on public.item_inventario
  for each row execute function public.registrar_auditoria();
create trigger trg_item_costo_auditoria
  after insert or update or delete on public.item_costo
  for each row execute function public.registrar_auditoria();
create trigger trg_consignante_auditoria
  after insert or update or delete on public.consignante
  for each row execute function public.registrar_auditoria();
