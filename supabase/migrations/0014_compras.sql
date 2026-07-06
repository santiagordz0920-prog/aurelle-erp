-- ═══════════════════════════════════════════════════════════════════════════
-- 0014_compras — Fase 2
-- Registro de compras a proveedor (§3.10). Cierra el ciclo Proveedores↔Finanzas:
-- una compra genera su asiento en el ledger (gasto o costo) y, si es a crédito,
-- la cuenta por pagar al proveedor con vencimiento. SOLO-ADMIN (área Dinero).
--
-- v1: cabecera de compra + asiento + CxP. La alta automática de items de
-- inventario desde líneas de compra (§3.10) queda como slice siguiente.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.tipo_compra as enum ('inventario', 'gasto');
create type public.condicion_compra as enum ('contado', 'credito');

create table public.compra (
  id                uuid primary key default gen_random_uuid(),
  proveedor_id      uuid references public.proveedor(id) on delete set null,
  fecha             date not null default current_date,
  concepto          text not null,
  tipo              public.tipo_compra not null default 'inventario',
  condicion_pago    public.condicion_compra not null default 'contado',
  monto             numeric(12,2) not null check (monto >= 0),
  fecha_vencimiento date,                        -- si es a crédito
  notas             text,
  sucursal_id       uuid not null references public.sucursal(id)
                      default '00000000-0000-0000-0000-000000000001',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_compra_proveedor on public.compra (proveedor_id, fecha desc);
create index idx_compra_fecha on public.compra (fecha desc);

create trigger trg_compra_updated_at before update on public.compra
  for each row execute function public.tocar_updated_at();

-- ── RLS: SOLO ADMIN ─────────────────────────────────────────────────────────
alter table public.compra enable row level security;
create policy "compra_admin" on public.compra for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create trigger trg_compra_auditoria after insert or update or delete on public.compra
  for each row execute function public.registrar_auditoria();

-- ── Evento: asiento en Finanzas + CxP al registrar una compra ───────────────
-- SECURITY DEFINER: escribe en tablas solo-admin. El gasto/costo se reconoce al
-- incurrirse; la CxP solo si la compra es a crédito (al contado no hay pasivo).
create or replace function public.asiento_de_compra()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.movimiento_financiero
    (fecha, categoria, concepto, monto, origen, sucursal_id)
  values
    (new.fecha,
     case when new.tipo = 'gasto' then 'gasto'::public.categoria_movimiento
          else 'costo'::public.categoria_movimiento end,
     'Compra: ' || new.concepto, new.monto, 'compra', new.sucursal_id);

  if new.condicion_pago = 'credito' then
    insert into public.cuenta_por_pagar
      (proveedor_id, concepto, monto, fecha_vencimiento, sucursal_id)
    values
      (new.proveedor_id, 'Compra: ' || new.concepto, new.monto,
       new.fecha_vencimiento, new.sucursal_id);
  end if;
  return new;
end $$;

create trigger trg_compra_asiento after insert on public.compra
  for each row execute function public.asiento_de_compra();
