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
