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
