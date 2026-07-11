-- ═══════════════════════════════════════════════════════════════════════════
-- 0032_tareas_recurrentes — Fase 5 (§3.15: tareas recurrentes)
-- Plantillas de tareas que se repiten (semanal/mensual): "conteo de vitrinas
-- (semanal)", "revisar precios de metales (mensual)". El cron nocturno genera la
-- instancia en `tarea` cuando toca, idempotente por período (una por semana/mes).
--
-- Función SEPARADA (`generar_tareas_recurrentes`) — no se toca el cron de
-- sugerencias; el route del cron llama ambas. `tarea.recurrente_id` liga la
-- instancia a su plantilla (traza + idempotencia precisa).
-- ═══════════════════════════════════════════════════════════════════════════

create type public.cadencia_tarea as enum ('semanal', 'mensual');

create table public.tarea_recurrente (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  detalle        text,
  responsable_id uuid references public.usuario(id),
  prioridad      public.prioridad_tarea not null default 'media',
  cadencia       public.cadencia_tarea not null default 'mensual',
  -- semanal: 1=lun … 7=dom (isodow). mensual: día del mes (1–28, evita fin de mes).
  dia            int not null default 1 check (dia between 1 and 28),
  activo         boolean not null default true,
  sucursal_id    uuid not null references public.sucursal(id)
                   default '00000000-0000-0000-0000-000000000001',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_recurrente_activo on public.tarea_recurrente (activo);

create trigger trg_recurrente_updated_at before update on public.tarea_recurrente
  for each row execute function public.tocar_updated_at();

-- Liga de la instancia generada a su plantilla.
alter table public.tarea
  add column if not exists recurrente_id uuid references public.tarea_recurrente(id) on delete set null;
create index if not exists idx_tarea_recurrente on public.tarea (recurrente_id);

-- ── RLS por sucursal (el equipo administra sus recurrentes) ─────────────────
alter table public.tarea_recurrente enable row level security;
create policy "recurrente_select" on public.tarea_recurrente for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "recurrente_write" on public.tarea_recurrente for all to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());

create trigger trg_recurrente_auditoria
  after insert or update or delete on public.tarea_recurrente
  for each row execute function public.registrar_auditoria();

-- ── Generador (lo llama el cron nocturno junto al de sugerencias) ───────────
-- Idempotente: una instancia por plantilla por período (semana/mes). Dispara en
-- el día configurado o después (por si el cron se salta un día).
create or replace function public.generar_tareas_recurrentes()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  n int := 0;
begin
  insert into public.tarea
    (titulo, detalle, responsable_id, prioridad, origen, recurrente_id, fecha_vencimiento, sucursal_id)
  select
    r.titulo, r.detalle, r.responsable_id, r.prioridad, 'manual', r.id, current_date, r.sucursal_id
  from public.tarea_recurrente r
  where r.activo
    and (
      (r.cadencia = 'semanal'
        and extract(isodow from now())::int >= r.dia
        and not exists (
          select 1 from public.tarea t
          where t.recurrente_id = r.id and t.created_at >= date_trunc('week', now())))
      or
      (r.cadencia = 'mensual'
        and extract(day from now())::int >= r.dia
        and not exists (
          select 1 from public.tarea t
          where t.recurrente_id = r.id and t.created_at >= date_trunc('month', now())))
    );
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.generar_tareas_recurrentes() to authenticated, service_role;
