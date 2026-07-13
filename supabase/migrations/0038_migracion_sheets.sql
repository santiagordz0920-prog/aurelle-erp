-- 0038 — Soporte para la migración de las 4 sheets al ERP (docs/MIGRACION_DATOS.md).
-- (1) Categoría 'transferencia_interna' en el ledger: movimientos cash↔cuenta que
--     NO son P&L (hallazgo del pre-macheo: $388,051 venían clasificados "Ingreso").
-- (2) Infraestructura de lotes de import: reversible (un DELETE por lote) e
--     idempotente (llave natural única por tabla) sin tocar las tablas de negocio.

alter type public.categoria_movimiento add value if not exists 'transferencia_interna';

-- ── migracion_lote ───────────────────────────────────────────────────────────
create table public.migracion_lote (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,                -- "sheets-2026-07", etc.
  notas       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_migracion_lote_updated_at
  before update on public.migracion_lote
  for each row execute function public.tocar_updated_at();

-- ── migracion_registro ───────────────────────────────────────────────────────
-- Una fila por registro tocado por el import. `creado=false` cuando el registro
-- ya existía (p.ej. cliente que el riel de WhatsApp ya creó) y solo se enlazó:
-- el revert NO lo borra. `llave` es la llave natural de idempotencia (teléfono,
-- fila de origen, sku…): re-correr el lote no duplica.
create table public.migracion_registro (
  id          uuid primary key default gen_random_uuid(),
  lote_id     uuid not null references public.migracion_lote(id) on delete cascade,
  tabla       text not null,
  registro_id uuid not null,
  llave       text not null,
  fila_origen text,                          -- "Libro/Pestaña/Rn" del paquete
  creado      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index uq_migracion_llave on public.migracion_registro (tabla, llave);
create index idx_migracion_lote on public.migracion_registro (lote_id, tabla);

-- ── RLS: SOLO ADMIN ─────────────────────────────────────────────────────────
alter table public.migracion_lote enable row level security;
create policy "migracion_lote_admin" on public.migracion_lote for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

alter table public.migracion_registro enable row level security;
create policy "migracion_registro_admin" on public.migracion_registro for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ── revertir_lote_migracion ─────────────────────────────────────────────────
-- Borra TODO lo creado por un lote, en orden inverso de FKs, y el lote mismo.
-- Los registros con creado=false (ya existían) se conservan. Las tablas hijas
-- (item_costo, pedido_costo, cotizacion_linea, nota_cliente) caen por cascada
-- de su padre: el import solo registra tablas con id propio.
create or replace function public.revertir_lote_migracion(p_lote uuid)
returns table (tabla text, borrados bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
  n bigint;
begin
  if not public.es_admin() and current_user not in ('postgres', 'service_role') then
    raise exception 'solo admin puede revertir un lote de migración';
  end if;

  foreach t in array array[
    'expo',
    'movimiento_financiero',
    'pago',
    'cotizacion',
    'pedido',
    'item_inventario',
    'cliente',
    'consignante',
    'proveedor'
  ] loop
    execute format(
      'delete from public.%I where id in
         (select registro_id from public.migracion_registro
           where lote_id = $1 and tabla = %L and creado)', t, t)
      using p_lote;
    get diagnostics n = row_count;
    if n > 0 then
      tabla := t; borrados := n; return next;
    end if;
  end loop;

  delete from public.migracion_lote where id = p_lote;
end;
$$;
