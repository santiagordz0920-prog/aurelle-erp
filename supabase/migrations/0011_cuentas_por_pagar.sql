-- ═══════════════════════════════════════════════════════════════════════════
-- 0011_cuentas_por_pagar — Fase 2
-- Cuentas por pagar (§3.9/§3.10). v1: CxP a consignante generada automáticamente
-- al reservar una pieza en consignación (matriz §4: "pieza reservada → si
-- consignación, Finanzas crea CxP al consignante"). SOLO-ADMIN.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.estado_cxp as enum ('pendiente', 'pagada', 'cancelada');

create table public.cuenta_por_pagar (
  id                uuid primary key default gen_random_uuid(),
  consignante_id    uuid references public.consignante(id) on delete set null,
  item_id           uuid references public.item_inventario(id) on delete set null,
  pedido_id         uuid references public.pedido(id) on delete set null,
  concepto          text not null,
  monto             numeric(12,2) not null default 0 check (monto >= 0),
  estado            public.estado_cxp not null default 'pendiente',
  fecha_vencimiento date,
  pagada_at         timestamptz,
  sucursal_id       uuid not null references public.sucursal(id)
                      default '00000000-0000-0000-0000-000000000001',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_cxp_estado on public.cuenta_por_pagar (estado);
create index idx_cxp_consignante on public.cuenta_por_pagar (consignante_id);
create index idx_cxp_item on public.cuenta_por_pagar (item_id);

create trigger trg_cxp_updated_at before update on public.cuenta_por_pagar
  for each row execute function public.tocar_updated_at();

-- ── RLS: SOLO ADMIN ─────────────────────────────────────────────────────────
alter table public.cuenta_por_pagar enable row level security;
create policy "cxp_admin" on public.cuenta_por_pagar for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_cxp_auditoria after insert or update or delete on public.cuenta_por_pagar
  for each row execute function public.registrar_auditoria();

-- ── Evento: CxP al reservar pieza de consignación ───────────────────────────
-- SECURITY DEFINER: ventas reserva el item pero la CxP es solo-admin; además lee
-- el costo (item_costo, solo-admin) para el monto a pagar al consignante.
create or replace function public.cxp_de_consignacion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_costo numeric(12,2);
begin
  if new.propiedad = 'consignacion'
     and new.estado = 'reservado'
     and new.consignante_id is not null
     and (old.estado is distinct from new.estado)
     and not exists (
       select 1 from public.cuenta_por_pagar
       where item_id = new.id and estado = 'pendiente'
     )
  then
    select costo into v_costo from public.item_costo where item_id = new.id;
    insert into public.cuenta_por_pagar
      (consignante_id, item_id, pedido_id, concepto, monto, sucursal_id)
    values
      (new.consignante_id, new.id, new.pedido_id,
       'Consignación reservada: ' || new.sku, coalesce(v_costo, 0), new.sucursal_id);
  end if;
  return new;
end $$;

create trigger trg_item_cxp after update on public.item_inventario
  for each row execute function public.cxp_de_consignacion();
