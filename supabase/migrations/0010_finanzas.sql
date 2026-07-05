-- ═══════════════════════════════════════════════════════════════════════════
-- 0010_finanzas — Fase 2
-- Ledger de asientos (§3.9). Categorías del negocio: deuda / gasto / capital /
-- ingreso / costo / pago_deuda. Cada asiento se vincula a su origen; la mayoría
-- se generan solos. TODO Finanzas es SOLO-ADMIN (regla dura).
--
-- Primer evento de la matriz §4 implementado: al registrar un `pago` se crea el
-- asiento de ingreso automáticamente (trigger de BD, efecto en la misma
-- transacción — ver docs/CONVENCIONES.md "Eventos entre módulos").
-- ═══════════════════════════════════════════════════════════════════════════

create type public.categoria_movimiento as enum (
  'deuda', 'gasto', 'capital', 'ingreso', 'costo', 'pago_deuda'
);

create table public.movimiento_financiero (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null default current_date,
  categoria      public.categoria_movimiento not null,
  concepto       text not null,
  monto          numeric(12,2) not null check (monto >= 0),  -- signo por categoría
  linea_negocio  public.linea_negocio,                       -- para P&L por línea
  -- Origen (una de estas se llena; todas opcionales):
  pedido_id      uuid references public.pedido(id) on delete set null,
  pago_id        uuid references public.pago(id) on delete set null,
  origen         text not null default 'manual',   -- 'pago' | 'manual' | 'gasto' | 'compra' | 'comision'
  folio_factura  text,                              -- reconciliación con contador (CFDI fuera del ERP)
  registrado_por uuid references public.usuario(id),
  sucursal_id    uuid not null references public.sucursal(id)
                   default '00000000-0000-0000-0000-000000000001',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_mov_fecha on public.movimiento_financiero (fecha desc);
create index idx_mov_categoria on public.movimiento_financiero (categoria);
create index idx_mov_pedido on public.movimiento_financiero (pedido_id);

create trigger trg_mov_updated_at before update on public.movimiento_financiero
  for each row execute function public.tocar_updated_at();

-- ── RLS: SOLO ADMIN en todas las operaciones ────────────────────────────────
alter table public.movimiento_financiero enable row level security;
create policy "mov_admin" on public.movimiento_financiero for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_mov_auditoria after insert or update or delete on public.movimiento_financiero
  for each row execute function public.registrar_auditoria();

-- ── Evento: asiento automático de ingreso al registrar un pago ──────────────
-- SECURITY DEFINER para poder insertar en la tabla solo-admin sin importar quién
-- registró el pago (ventas incluido). Deriva línea y sucursal del pedido.
create or replace function public.asiento_de_pago()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_linea public.linea_negocio;
  v_suc   uuid;
begin
  select linea_negocio, sucursal_id into v_linea, v_suc
  from public.pedido where id = new.pedido_id;

  insert into public.movimiento_financiero
    (fecha, categoria, concepto, monto, linea_negocio, pedido_id, pago_id, origen, registrado_por, sucursal_id)
  values
    (new.fecha, 'ingreso', 'Pago: ' || new.tipo, new.monto, v_linea,
     new.pedido_id, new.id, 'pago', new.registrado_por,
     coalesce(v_suc, '00000000-0000-0000-0000-000000000001'));
  return new;
end $$;

create trigger trg_pago_asiento after insert on public.pago
  for each row execute function public.asiento_de_pago();
