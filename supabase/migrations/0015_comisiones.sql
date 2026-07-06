-- ═══════════════════════════════════════════════════════════════════════════
-- 0015_comisiones — Fase 2
-- Comisiones a planners/referidores (§3.9/§3.17): devengadas al cierre del
-- pedido, % sobre la UTILIDAD REAL (total − costo_real). SOLO-ADMIN.
--
-- v1: registro manual de la comisión sobre un pedido (el monto lo calcula el
-- Server Action a partir de pedido_costo, solo-admin). El devengo AUTOMÁTICO al
-- entregar (cuando el pedido lleve referidor + %) queda como slice siguiente.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.tipo_comision as enum ('planner', 'referidor', 'otro');
create type public.estado_comision as enum ('devengada', 'pagada', 'cancelada');

create table public.comision (
  id            uuid primary key default gen_random_uuid(),
  pedido_id     uuid references public.pedido(id) on delete set null,
  beneficiario  text not null,
  tipo          public.tipo_comision not null default 'referidor',
  porcentaje    numeric(5,2) not null check (porcentaje >= 0 and porcentaje <= 100),
  monto         numeric(12,2) not null default 0 check (monto >= 0),
  estado        public.estado_comision not null default 'devengada',
  pagada_at     timestamptz,
  sucursal_id   uuid not null references public.sucursal(id)
                  default '00000000-0000-0000-0000-000000000001',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_comision_estado on public.comision (estado);
create index idx_comision_pedido on public.comision (pedido_id);

create trigger trg_comision_updated_at before update on public.comision
  for each row execute function public.tocar_updated_at();

-- ── RLS: SOLO ADMIN ─────────────────────────────────────────────────────────
alter table public.comision enable row level security;
create policy "comision_admin" on public.comision for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create trigger trg_comision_auditoria after insert or update or delete on public.comision
  for each row execute function public.registrar_auditoria();
