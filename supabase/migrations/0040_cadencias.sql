-- ═══════════════════════════════════════════════════════════════════════════
-- 0040_cadencias — Fase 5/6 (Follow-ups / cadencias, F1 semiautomática)
-- Diseño: docs/DISENO_FUNNEL_MENSAJES.md + docs/SPEC_FOLLOWUPS.md.
-- Decisión (DECISIONES 2026-07-12): NO tabla `lead` paralela — `cliente` YA es
-- el lead. Aquí: (1) campos de cadencia en cliente, (2) tabla `toque` (bitácora
-- de cada envío, con atribución de respuesta/cita para medir), (3) plantillas
-- editables por (estado, toque), (4) flags es_simulacion para el simulador (§8).
-- ═══════════════════════════════════════════════════════════════════════════

-- Estado de cadencia del lead (8 estados del spec; distinto de estado_pipeline,
-- que sigue manejando el funnel existente). null = fuera de cadencia.
create type public.estado_cadencia as enum (
  'nuevo', 'caliente', 'citado', 'cotizado', 'no_asistio', 'frio', 'cliente', 'descartado'
);

-- Arquetipo del mensaje (la "paleta" del diseño §2).
create type public.arquetipo_toque as enum (
  'continuidad', 'valor', 'invitacion', 'urgencia', 'incentivo',
  'cierre_suave', 'confirmacion', 'recordatorio', 'reactivacion'
);

-- ── Campos de cadencia en cliente ───────────────────────────────────────────
alter table public.cliente
  add column if not exists estado_cadencia   public.estado_cadencia,
  add column if not exists cadencia_toque_n  smallint not null default 0,
  add column if not exists proximo_toque_at  timestamptz,
  add column if not exists cadencia_pausada  boolean not null default false,
  add column if not exists escalado          boolean not null default false,
  add column if not exists fecha_propuesta   date,        -- cuándo piensa proponer/casarse
  add column if not exists es_simulacion     boolean not null default false;

comment on column public.cliente.estado_cadencia is
  'Estado en el motor de follow-ups (§ DISENO_FUNNEL_MENSAJES). null = no está en cadencia.';
comment on column public.cliente.fecha_propuesta is
  'Dato de calificación #1: cuándo piensa proponer/casarse. Habilita la única urgencia honesta.';
comment on column public.cliente.escalado is
  '2ct+/presupuesto alto/piedra importante: cadencia DETENIDA, lo toma un humano.';

create index if not exists idx_cliente_proximo_toque
  on public.cliente (proximo_toque_at)
  where estado_cadencia is not null and not cadencia_pausada and not escalado;
create index if not exists idx_cliente_estado_cadencia on public.cliente (estado_cadencia);

-- es_simulacion también en conversación y cita (el simulador marca TODO lo suyo).
alter table public.conversacion add column if not exists es_simulacion boolean not null default false;
alter table public.cita add column if not exists es_simulacion boolean not null default false;

-- ── plantilla_cadencia: el texto de cada toque, editable por admin ──────────
create table public.plantilla_cadencia (
  id              uuid primary key default gen_random_uuid(),
  estado_cadencia public.estado_cadencia not null,
  toque_n         smallint not null,
  arquetipo       public.arquetipo_toque not null,
  variante        text not null default 'A',       -- para el A/B futuro (§4)
  texto           text not null,                    -- placeholders {nombre} {interes} {horario} {fecha}
  offset_horas    integer not null,                 -- desde que entra al estado (o desde la cita en CITADO)
  activa          boolean not null default true,
  pendiente_contenido boolean not null default false, -- INCENTIVO: contenido a definir con Fer (§7.2)
  sucursal_id     uuid not null references public.sucursal(id)
                    default '00000000-0000-0000-0000-000000000001',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index uq_plantilla_cadencia
  on public.plantilla_cadencia (estado_cadencia, toque_n, variante);

create trigger trg_plantilla_cadencia_updated_at
  before update on public.plantilla_cadencia
  for each row execute function public.tocar_updated_at();

-- ── toque: un renglón por envío (bitácora + instrumentación §3) ─────────────
create table public.toque (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.cliente(id) on delete cascade,
  estado_cadencia public.estado_cadencia not null,
  toque_n         smallint not null,
  arquetipo       public.arquetipo_toque not null,
  plantilla_id    uuid references public.plantilla_cadencia(id),
  variante        text,
  canal           text not null default 'manual',   -- 'manual' (copiar/pegar) | 'plantilla_api'
  texto_enviado   text,
  enviado_at      timestamptz not null default now(),
  enviado_por     uuid references public.usuario(id) default auth.uid(),
  respondido_at   timestamptz,                       -- lo llena registrarEntrante (atribución)
  cita_id         uuid references public.cita(id) on delete set null,
  wa_id           text,
  es_simulacion   boolean not null default false,
  sucursal_id     uuid not null references public.sucursal(id)
                    default '00000000-0000-0000-0000-000000000001',
  created_at      timestamptz not null default now()
);
create index idx_toque_cliente on public.toque (cliente_id, enviado_at desc);
create index idx_toque_enviado_at on public.toque (enviado_at desc);
create index idx_toque_sin_respuesta on public.toque (cliente_id) where respondido_at is null;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.plantilla_cadencia enable row level security;
create policy "plantilla_cadencia_select" on public.plantilla_cadencia
  for select to authenticated using (true);
-- Edición de plantillas: solo admin (es contenido de marca / estrategia).
create policy "plantilla_cadencia_write" on public.plantilla_cadencia
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

alter table public.toque enable row level security;
create policy "toque_select" on public.toque
  for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "toque_write" on public.toque
  for all to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());

-- Auditoría de la bitácora de toques.
create trigger trg_toque_auditoria
  after insert or update or delete on public.toque
  for each row execute function public.registrar_auditoria();

-- ── Seed de plantillas F1 (starter copy en tono Aurelle; editable) ──────────
-- Placeholders: {nombre} {interes} {horario} {fecha}. INCENTIVO queda pendiente
-- de contenido (sesión con Fer, §7.2) pero con texto usable mientras.
insert into public.plantilla_cadencia (estado_cadencia, toque_n, arquetipo, texto, offset_horas, pendiente_contenido) values
  -- NUEVO (T1 lo hace el bot; aquí T2/T3)
  ('nuevo', 2, 'continuidad', 'Hola {nombre}, quedé pendiente de ti. ¿Sigues buscando algo para tu anillo o argollas?', 24, false),
  ('nuevo', 3, 'invitacion', 'Si quieres, te espero en el showroom para que los veas en persona sin compromiso. ¿Te gustaría?', 72, false),
  -- CALIENTE
  ('caliente', 1, 'continuidad', 'Hola {nombre}, seguí pensando en lo de {interes}. ¿Cómo vas con la decisión?', 0, false),
  ('caliente', 2, 'valor', 'Nos llegaron piezas que van justo con lo que buscabas. ¿Te comparto un par de opciones?', 48, false),
  ('caliente', 3, 'invitacion', 'Tengo espacio {horario} en el showroom si quieres pasar a verlos. ¿Puedes ese día?', 96, false),
  ('caliente', 4, 'cierre_suave', 'No te quiero saturar, {nombre}. Aquí quedo cuando gustes retomarlo.', 168, false),
  -- CITADO (anclado a la cita: offset negativo/relativo se maneja en el motor)
  ('citado', 1, 'confirmacion', 'Listo {nombre}, quedó tu cita para {fecha} a las {horario}. Te espero.', 0, false),
  ('citado', 2, 'recordatorio', 'Hola {nombre}, te recuerdo tu cita mañana a las {horario}. ¿Sigue en pie?', 0, false),
  ('citado', 3, 'recordatorio', 'Nos vemos hoy a las {horario} en el showroom, {nombre}.', 0, false),
  -- NO_ASISTIO
  ('no_asistio', 1, 'continuidad', 'Hoy no coincidimos, {nombre}. ¿Buscamos otro momento que te acomode mejor?', 3, false),
  ('no_asistio', 2, 'invitacion', 'Sigo con ganas de mostrarte las piezas. ¿Te va {horario}?', 48, false),
  ('no_asistio', 3, 'incentivo', '[Pendiente de contenido: incentivo grabado gratis al reagendar]', 120, true),
  -- COTIZADO
  ('cotizado', 1, 'continuidad', 'Hola {nombre}, ¿qué te pareció lo que vimos? Quedo al pendiente de tus dudas.', 24, false),
  ('cotizado', 2, 'incentivo', '[Pendiente de contenido: apartado $1,000 congela precio]', 72, true),
  ('cotizado', 3, 'urgencia', 'Recuerda que la cotización tiene vigencia de 15 días porque el metal y el diamante fluctúan.', 168, false),
  ('cotizado', 4, 'cierre_suave', 'No quiero presionarte, {nombre}. Cuando estés listo, aquí seguimos.', 336, false),
  -- FRIO (reactivación espaciada)
  ('frio', 1, 'reactivacion', 'Hola {nombre}, ¿cómo vas con lo de {interes}? Aquí seguimos por si retomas.', 168, false),
  ('frio', 2, 'valor', 'Te comparto una idea nueva que puede encajar con lo que buscabas.', 360, false),
  ('frio', 3, 'urgencia', 'Si aún piensas en la fecha, conviene ir arrancando el taller con tiempo.', 720, false),
  ('frio', 4, 'incentivo', '[Pendiente de contenido: incentivo de reactivación]', 1440, true),
  ('frio', 5, 'cierre_suave', 'Voy a dejar de escribirte para no incomodar, {nombre}. Aquí estaré cuando gustes.', 2160, false);
