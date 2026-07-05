-- ═══════════════════════════════════════════════════════════════════════════
-- 0012_proveedores — Fase 2
-- Directorio de proveedores y sus condiciones (§3.10). v1: directorio. Las
-- compras (altas de inventario / gasto) y el historial de precios llegan en
-- slices siguientes. Vive bajo el área Dinero → SOLO-ADMIN.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.proveedor (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  contacto         text,
  categorias       text[] not null default '{}',   -- metales, piedras, casting, empaque…
  condiciones_pago text,                            -- "30 días", "contado", etc.
  notas            text,
  sucursal_id      uuid not null references public.sucursal(id)
                     default '00000000-0000-0000-0000-000000000001',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_proveedor_nombre_lower on public.proveedor (lower(nombre));
create index idx_proveedor_categorias on public.proveedor using gin (categorias);

create trigger trg_proveedor_updated_at before update on public.proveedor
  for each row execute function public.tocar_updated_at();

-- ── RLS: SOLO ADMIN (área Dinero) ───────────────────────────────────────────
alter table public.proveedor enable row level security;
create policy "proveedor_admin" on public.proveedor for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_proveedor_auditoria after insert or update or delete on public.proveedor
  for each row execute function public.registrar_auditoria();

-- Enlaza la CxP a proveedor (además de consignante) para las compras futuras.
alter table public.cuenta_por_pagar
  add column proveedor_id uuid references public.proveedor(id) on delete set null;
