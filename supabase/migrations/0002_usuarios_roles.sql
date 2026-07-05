-- ═══════════════════════════════════════════════════════════════════════════
-- 0002_usuarios_roles — Fase 0
-- Roles, perfil de usuario y las funciones helper que TODAS las policies usan.
-- Los permisos viven en la base de datos (§0.6), no solo en la interfaz.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enum de roles (Plan Maestro §3.17) ──────────────────────────────────────
create type public.rol as enum ('admin', 'ventas', 'taller');

-- ── usuario ─────────────────────────────────────────────────────────────────
-- Perfil de aplicación 1:1 con auth.users. La autenticación la maneja Supabase
-- Auth; aquí guardamos rol, sucursal y nombre.
create table public.usuario (
  id           uuid primary key references auth.users(id) on delete cascade,
  nombre       text not null,
  rol          public.rol not null default 'ventas',
  sucursal_id  uuid not null references public.sucursal(id)
                 default '00000000-0000-0000-0000-000000000001',
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_usuario_updated_at
  before update on public.usuario
  for each row execute function public.tocar_updated_at();

-- ── Funciones helper de autorización ────────────────────────────────────────
-- SECURITY DEFINER para poder leer public.usuario sin recursión de RLS.
-- Se usan en las policies de todo el esquema (ver plantilla en CONVENCIONES).

create or replace function public.rol_actual()
returns public.rol
language sql stable security definer set search_path = public
as $$
  select rol from public.usuario where id = auth.uid();
$$;

create or replace function public.es_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select rol = 'admin' from public.usuario where id = auth.uid()), false);
$$;

create or replace function public.sucursal_actual()
returns uuid
language sql stable security definer set search_path = public
as $$
  select sucursal_id from public.usuario where id = auth.uid();
$$;

-- ── Alta automática de perfil al registrarse en Auth ────────────────────────
-- Crea la fila en public.usuario cuando nace un auth.users. El nombre viene de
-- los metadatos del signup; rol por defecto 'ventas' (a admin se promueve a
-- mano). Sucursal por defecto: Ellion.
create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.usuario (id, nombre)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_auth_nuevo_usuario
  after insert on auth.users
  for each row execute function public.manejar_nuevo_usuario();

-- ── RLS de usuario ──────────────────────────────────────────────────────────
alter table public.usuario enable row level security;

-- Cada quien lee su propia fila; admin lee todas.
create policy "usuario_select_propio_o_admin"
  on public.usuario for select
  to authenticated
  using (id = auth.uid() or public.es_admin());

-- Solo admin da de alta / edita perfiles (rol, sucursal, activo).
create policy "usuario_insert_admin"
  on public.usuario for insert
  to authenticated
  with check (public.es_admin());

create policy "usuario_update_admin"
  on public.usuario for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ── Policies de escritura de sucursal (ahora que es_admin() existe) ─────────
create policy "sucursal_insert_admin"
  on public.sucursal for insert to authenticated with check (public.es_admin());

create policy "sucursal_update_admin"
  on public.sucursal for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
