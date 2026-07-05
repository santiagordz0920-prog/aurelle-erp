-- ═══════════════════════════════════════════════════════════════════════════
-- 0001_fundaciones — Fase 0
-- Extensiones, helper de updated_at y la dimensión multi-sucursal.
-- Regla del Plan Maestro: toda tabla de negocio lleva sucursal_id (§0.7).
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ── Helper: mantiene updated_at en cada UPDATE ──────────────────────────────
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── sucursal ────────────────────────────────────────────────────────────────
-- Hoy solo existe Ellion; Los Cabos algún día será una fila más, no una
-- reconstrucción. Id fijo para Ellion para poder referenciarlo desde seeds
-- y desde el trigger de alta de usuarios.
create table public.sucursal (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  activa      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_sucursal_updated_at
  before update on public.sucursal
  for each row execute function public.tocar_updated_at();

insert into public.sucursal (id, nombre)
values ('00000000-0000-0000-0000-000000000001', 'Ellion')
on conflict (id) do nothing;

-- RLS: toda persona autenticada puede leer el catálogo de sucursales;
-- solo admin puede modificarlo (la función es_admin() se crea en 0002).
alter table public.sucursal enable row level security;

create policy "sucursal_select_autenticados"
  on public.sucursal for select
  to authenticated
  using (true);
