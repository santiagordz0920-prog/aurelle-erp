-- ═══════════════════════════════════════════════════════════════════════════
-- 0004_clientes — Fase 1
-- CRM v1: el cliente y sus notas internas. WhatsApp/IA/lifecycle son Fases 3/5.
-- El teléfono es el identificador natural del cliente (§3.1).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enums ───────────────────────────────────────────────────────────────────
-- Canal de origen del lead (§3.1: ads con fase/zona, expo, referido, orgánico).
create type public.canal_fuente as enum ('ads', 'expo', 'referido', 'organico');

-- Pipeline de lead (§3.1).
create type public.estado_pipeline as enum (
  'nuevo', 'conversando', 'cita_agendada', 'visito', 'cotizado', 'cerrado', 'perdido'
);

-- ── cliente ─────────────────────────────────────────────────────────────────
create table public.cliente (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  telefono           text,                      -- WhatsApp; identificador natural
  fecha_nacimiento   date,
  fecha_boda         date,
  pareja_nombre      text,
  -- Fuente de origen: canal + detalle libre (p.ej. "Fase 1 SPGG", nombre de expo)
  fuente_canal       public.canal_fuente,
  fuente_detalle     text,
  -- Referido: por otro cliente (interno) o por un contacto externo (texto)
  referido_por_cliente_id uuid references public.cliente(id) on delete set null,
  referido_por_externo    text,
  etiquetas          text[] not null default '{}',
  estado_pipeline    public.estado_pipeline not null default 'nuevo',
  motivo_perdida     text,                       -- solo cuando estado = 'perdido'
  sucursal_id        uuid not null references public.sucursal(id)
                       default '00000000-0000-0000-0000-000000000001',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Teléfono único cuando existe (evita duplicar el mismo cliente).
create unique index uq_cliente_telefono
  on public.cliente (telefono) where telefono is not null;
create index idx_cliente_estado on public.cliente (estado_pipeline);
create index idx_cliente_canal on public.cliente (fuente_canal);
create index idx_cliente_sucursal on public.cliente (sucursal_id);
create index idx_cliente_nombre_lower on public.cliente (lower(nombre));
create index idx_cliente_etiquetas on public.cliente using gin (etiquetas);

create trigger trg_cliente_updated_at
  before update on public.cliente
  for each row execute function public.tocar_updated_at();

-- ── nota_cliente ────────────────────────────────────────────────────────────
-- Notas internas, invisibles al cliente (§3.1). Varias por cliente, con autor.
create table public.nota_cliente (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.cliente(id) on delete cascade,
  autor_id    uuid references public.usuario(id),
  texto       text not null,
  created_at  timestamptz not null default now()
);
create index idx_nota_cliente_cliente on public.nota_cliente (cliente_id, created_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Clientes: admin ve todo; el resto ve/edita los de su sucursal. NO es solo-admin
-- (Ventas necesita el CRM). Sin datos de margen/finanzas aquí, así que sin
-- restricción extra por rol.
alter table public.cliente enable row level security;

create policy "cliente_select" on public.cliente for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "cliente_insert" on public.cliente for insert to authenticated
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "cliente_update" on public.cliente for update to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "cliente_delete" on public.cliente for delete to authenticated
  using (public.es_admin());

alter table public.nota_cliente enable row level security;

create policy "nota_select" on public.nota_cliente for select to authenticated
  using (exists (
    select 1 from public.cliente c
    where c.id = cliente_id
      and (public.es_admin() or c.sucursal_id = public.sucursal_actual())
  ));
create policy "nota_insert" on public.nota_cliente for insert to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.cliente c
      where c.id = cliente_id
        and (public.es_admin() or c.sucursal_id = public.sucursal_actual())
    )
  );

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_cliente_auditoria
  after insert or update or delete on public.cliente
  for each row execute function public.registrar_auditoria();
