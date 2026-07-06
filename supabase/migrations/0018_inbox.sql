-- ═══════════════════════════════════════════════════════════════════════════
-- 0018_inbox — Fase 3
-- Inbox unificado de WhatsApp (§3.1): estructura de conversaciones y mensajes.
-- Esta migración deja la BASE lista; el riel vivo (webhook de Meta → escribir
-- mensajes entrantes, enviar por Cloud API → mensajes salientes) se enchufa
-- después, cuando Santiago tenga verificación + WABA. Sin Meta, la pantalla usa
-- datos de muestra.
--
-- Regla del §3.1: el teléfono es el identificador; un mensaje entrante crea o
-- actualiza al cliente. Eso lo hará el webhook (Server Action) más adelante.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.estado_conversacion as enum ('abierta', 'cerrada');
create type public.direccion_mensaje as enum ('entrante', 'saliente');
create type public.tipo_mensaje as enum ('texto', 'imagen', 'documento', 'audio', 'plantilla');

create table public.conversacion (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid references public.cliente(id) on delete set null,
  telefono     text not null,                    -- identificador natural (wa)
  estado       public.estado_conversacion not null default 'abierta',
  no_leidos    int not null default 0,
  ultimo_at    timestamptz,                       -- para ordenar el inbox
  sucursal_id  uuid not null references public.sucursal(id)
                 default '00000000-0000-0000-0000-000000000001',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index uq_conversacion_tel on public.conversacion (sucursal_id, telefono);
create index idx_conversacion_cliente on public.conversacion (cliente_id);
create index idx_conversacion_ultimo on public.conversacion (ultimo_at desc);

create trigger trg_conversacion_updated_at before update on public.conversacion
  for each row execute function public.tocar_updated_at();

create table public.mensaje (
  id              uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversacion(id) on delete cascade,
  direccion       public.direccion_mensaje not null,
  tipo            public.tipo_mensaje not null default 'texto',
  cuerpo          text,
  media_url       text,
  es_ia           boolean not null default false,   -- respuesta redactada por IA
  estado_entrega  text,                              -- salientes: enviado/entregado/leido
  wa_id           text,                              -- id del mensaje en Meta (dedup)
  autor_id        uuid references public.usuario(id),-- quién lo envió (saliente manual)
  created_at      timestamptz not null default now()
);
create index idx_mensaje_conversacion on public.mensaje (conversacion_id, created_at);
create unique index uq_mensaje_wa on public.mensaje (wa_id) where wa_id is not null;

-- ── RLS: por sucursal (vía la conversación) ─────────────────────────────────
alter table public.conversacion enable row level security;
create policy "conversacion_select" on public.conversacion for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "conversacion_write" on public.conversacion for all to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());

alter table public.mensaje enable row level security;
create policy "mensaje_select" on public.mensaje for select to authenticated
  using (exists (select 1 from public.conversacion c where c.id = conversacion_id
    and (public.es_admin() or c.sucursal_id = public.sucursal_actual())));
create policy "mensaje_write" on public.mensaje for all to authenticated
  using (exists (select 1 from public.conversacion c where c.id = conversacion_id
    and (public.es_admin() or c.sucursal_id = public.sucursal_actual())))
  with check (exists (select 1 from public.conversacion c where c.id = conversacion_id
    and (public.es_admin() or c.sucursal_id = public.sucursal_actual())));

-- ── Auditoría (solo conversación; los mensajes son alto volumen) ────────────
create trigger trg_conversacion_auditoria after insert or update or delete on public.conversacion
  for each row execute function public.registrar_auditoria();
