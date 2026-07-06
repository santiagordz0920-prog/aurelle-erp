-- ═══════════════════════════════════════════════════════════════════════════
-- 0017_citas — Fase 3
-- Calendario del showroom Ellion (§3.2). Base sobre la que el bot reservará
-- (Fase 3, cuando el riel de WhatsApp esté vivo). Usable de inmediato por
-- Santiago/Fer para agendar y capturar resultados a mano.
--
-- El resultado obligatorio (no_asistio/asistio/cotizo/cerro) ES el funnel
-- inquiry→visita→cotización→cierre. Anti doble-reserva se valida en el Server
-- Action (chequeo de traslape por sala); v2 podría usar exclusion constraint.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.tipo_cita as enum (
  'primera_visita', 'seguimiento', 'cierre', 'entrega', 'postventa', 'noche_privada'
);
create type public.sala_cita as enum ('piso_ventas', 'closing_room');
create type public.estado_cita as enum ('agendada', 'confirmada', 'completada', 'cancelada');
-- Resultado de la cita (se captura al completarla). 'no_asistio' = no-show.
create type public.resultado_cita as enum ('no_asistio', 'asistio', 'cotizo', 'cerro');

create table public.cita (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references public.cliente(id) on delete cascade,
  tipo         public.tipo_cita not null default 'primera_visita',
  sala         public.sala_cita not null default 'piso_ventas',
  inicio       timestamptz not null,
  duracion_min int not null default 60 check (duracion_min between 15 and 480),
  estado       public.estado_cita not null default 'agendada',
  resultado    public.resultado_cita,               -- null hasta completar
  pedido_id    uuid references public.pedido(id) on delete set null,  -- si es entrega
  notas        text,
  creada_por   uuid references public.usuario(id),
  sucursal_id  uuid not null references public.sucursal(id)
                 default '00000000-0000-0000-0000-000000000001',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_cita_inicio on public.cita (inicio);
create index idx_cita_cliente on public.cita (cliente_id, inicio desc);
create index idx_cita_estado on public.cita (estado);
create index idx_cita_sala_inicio on public.cita (sala, inicio);

create trigger trg_cita_updated_at before update on public.cita
  for each row execute function public.tocar_updated_at();

-- ── RLS: por sucursal (Ventas necesita las citas; no es solo-admin) ─────────
alter table public.cita enable row level security;
create policy "cita_select" on public.cita for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "cita_insert" on public.cita for insert to authenticated
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "cita_update" on public.cita for update to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "cita_delete" on public.cita for delete to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_cita_auditoria after insert or update or delete on public.cita
  for each row execute function public.registrar_auditoria();
