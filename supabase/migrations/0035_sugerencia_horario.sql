-- ═══════════════════════════════════════════════════════════════════════════
-- 0035_sugerencia_horario — candado entre chats para los horarios que el bot
-- sugiere (pedido de Fer 2026-07-11). Cuando el bot propone "el martes a las
-- 5" en una conversación, aparta ese slot: otro chat simultáneo NO recibirá el
-- mismo horario aunque la cita aún no exista. La sugerencia caduca a las 24 h
-- (el código borra las vencidas antes de apartar). La disponibilidad real
-- sigue siendo la tabla `cita` (0017); esto solo evita sugerir doble.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.sugerencia_horario (
  id              uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversacion(id) on delete cascade,
  sala            public.sala_cita not null default 'piso_ventas',
  inicio          timestamptz not null,
  created_at      timestamptz not null default now()
);

-- Un slot solo puede estar sugerido a UNA conversación a la vez: si dos bots
-- corren al mismo tiempo, el segundo insert falla y elige el siguiente horario.
create unique index uq_sugerencia_sala_inicio on public.sugerencia_horario (sala, inicio);
create index idx_sugerencia_creada on public.sugerencia_horario (created_at);

-- Escribe el bot (service_role, brinca RLS); para usuarios es solo-admin
-- (tabla operativa interna, no se muestra en UI por ahora).
alter table public.sugerencia_horario enable row level security;
create policy "sugerencia_horario_admin" on public.sugerencia_horario
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
