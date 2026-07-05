-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  APLICAR MIGRACIONES 0005 → 0008  (Inventario, Cotizador, Pedidos)          ║
-- ║  ERP Aurelle — pegar TODO este archivo en el SQL Editor de Supabase y Run.  ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
--
-- CONTEXTO: la migración 0004 (Clientes) YA está aplicada en esta base
--   (tablas cliente y nota_cliente existen). Este archivo aplica SOLO lo que
--   falta: 0005 (inventario), 0006 (fix auditoría), 0007 (cotizador) y
--   0008 (pedidos). NO incluye 0004 a propósito.
--
-- Solo CREA cosas nuevas — no borra ni modifica datos existentes.
-- El orden importa y ya está en orden. Pegar completo y darle Run una vez.
--
-- Si saliera de nuevo un error "already exists", párate ahí y avísame.
-- ═══════════════════════════════════════════════════════════════════════════════


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


-- ═══════════════════════════════════════════════════════════════════════════
-- 0006_auditoria_generica — Fase 1
-- Arregla registrar_auditoria() para tablas cuya llave primaria no se llama
-- "id" (p.ej. item_costo.item_id). Deriva la PK del catálogo, sin hardcodear.
-- Reemplaza la versión de 0003 (create or replace); los triggers no cambian.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.registrar_auditoria()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) else null end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) else null end;
  v_rec jsonb := coalesce(v_new, v_old);
  v_pk  text;
  v_id  text;
begin
  -- Primera columna de la llave primaria de la tabla que disparó el trigger.
  select a.attname into v_pk
  from pg_index i
  join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
  where i.indrelid = tg_relid and i.indisprimary
  order by array_position(i.indkey, a.attnum)
  limit 1;

  v_id := coalesce(v_rec ->> v_pk, 'desconocido');

  insert into public.auditoria (tabla, registro_id, accion, usuario_id, datos_antes, datos_despues)
  values (tg_table_name, v_id, tg_op, auth.uid(), v_old, v_new);

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


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


-- ═══════════════════════════════════════════════════════════════════════════
-- 0008_pedidos — Fase 1
-- LA columna vertebral. Todo cuelga de aquí: pagos, reserva de inventario,
-- costo/margen real (solo-admin), candado de anticipo 2.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.linea_negocio as enum ('bridal', 'concierge');
create type public.estado_pedido as enum (
  'por_confirmar', 'confirmado', 'en_produccion', 'listo_entrega', 'entregado', 'cancelado'
);
create type public.metodo_pago as enum ('efectivo', 'transferencia', 'tarjeta', 'otro');
create type public.tipo_pago as enum ('anticipo_1', 'anticipo_2', 'parcialidad', 'liquidacion');

-- ── pedido ──────────────────────────────────────────────────────────────────
create table public.pedido (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references public.cliente(id),
  cotizacion_id    uuid references public.cotizacion(id) on delete set null,
  linea_negocio    public.linea_negocio not null,
  estado           public.estado_pedido not null default 'por_confirmar',
  total            numeric(12,2) not null default 0,
  fecha_compromiso date,
  -- Candado de anticipo 2 (30%): la compra de materiales se bloquea hasta que
  -- se registre el anticipo 2, salvo override explícito de admin (auditado).
  override_candado boolean not null default false,
  override_por     uuid references public.usuario(id),
  override_at      timestamptz,
  entregado_at     timestamptz,
  sucursal_id      uuid not null references public.sucursal(id)
                     default '00000000-0000-0000-0000-000000000001',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_pedido_cliente on public.pedido (cliente_id);
create index idx_pedido_estado on public.pedido (estado);
create trigger trg_pedido_updated_at before update on public.pedido
  for each row execute function public.tocar_updated_at();

-- ── pago ────────────────────────────────────────────────────────────────────
create table public.pago (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references public.pedido(id) on delete cascade,
  monto          numeric(12,2) not null check (monto > 0),
  fecha          date not null default current_date,
  metodo         public.metodo_pago not null default 'transferencia',
  tipo           public.tipo_pago not null,
  notas          text,
  registrado_por uuid references public.usuario(id),
  created_at     timestamptz not null default now()
);
create index idx_pago_pedido on public.pago (pedido_id, created_at);

-- ── pedido_costo (SOLO ADMIN) ───────────────────────────────────────────────
create table public.pedido_costo (
  pedido_id      uuid primary key references public.pedido(id) on delete cascade,
  costo_real     numeric(12,2) not null default 0,
  margen_sellado numeric(6,2),                 -- % sellado al entregar
  updated_at     timestamptz not null default now()
);
create trigger trg_pedido_costo_updated_at before update on public.pedido_costo
  for each row execute function public.tocar_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.pedido enable row level security;
create policy "pedido_select" on public.pedido for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "pedido_insert" on public.pedido for insert to authenticated
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "pedido_update" on public.pedido for update to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "pedido_delete" on public.pedido for delete to authenticated
  using (public.es_admin());

alter table public.pago enable row level security;
create policy "pago_select" on public.pago for select to authenticated
  using (exists (select 1 from public.pedido p where p.id = pedido_id
    and (public.es_admin() or p.sucursal_id = public.sucursal_actual())));
create policy "pago_insert" on public.pago for insert to authenticated
  with check (
    registrado_por = auth.uid()
    and exists (select 1 from public.pedido p where p.id = pedido_id
      and (public.es_admin() or p.sucursal_id = public.sucursal_actual())));

alter table public.pedido_costo enable row level security;
create policy "pedido_costo_admin" on public.pedido_costo for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_pedido_auditoria after insert or update or delete on public.pedido
  for each row execute function public.registrar_auditoria();
create trigger trg_pago_auditoria after insert or update or delete on public.pago
  for each row execute function public.registrar_auditoria();
create trigger trg_pedido_costo_auditoria after insert or update or delete on public.pedido_costo
  for each row execute function public.registrar_auditoria();


-- FIN. Tras esto quedan Inventario, Cotizador y Pedidos en producción.
