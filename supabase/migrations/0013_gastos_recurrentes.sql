-- ═══════════════════════════════════════════════════════════════════════════
-- 0013_gastos_recurrentes — Fase 2
-- Renta de Ellion, suscripciones, servicios: se dan de alta una vez y se
-- postean solos al ledger cada mes (§3.11). SOLO-ADMIN (área Dinero).
-- El posteo es idempotente por mes vía `ultimo_posteo` (primer día del mes ya
-- posteado): correrlo dos veces el mismo mes no duplica.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.gasto_recurrente (
  id            uuid primary key default gen_random_uuid(),
  concepto      text not null,
  monto         numeric(12,2) not null check (monto >= 0),
  categoria     text,                              -- 'renta','suscripción','servicio'…
  periodicidad  text not null default 'mensual' check (periodicidad in ('mensual')),
  dia_cargo     int  not null default 1 check (dia_cargo between 1 and 28),
  activo        boolean not null default true,
  ultimo_posteo date,                              -- primer día del mes ya posteado
  sucursal_id   uuid not null references public.sucursal(id)
                  default '00000000-0000-0000-0000-000000000001',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_gasto_rec_activo on public.gasto_recurrente (activo);

create trigger trg_gasto_rec_updated_at before update on public.gasto_recurrente
  for each row execute function public.tocar_updated_at();

-- ── RLS: SOLO ADMIN ─────────────────────────────────────────────────────────
alter table public.gasto_recurrente enable row level security;
create policy "gasto_rec_admin" on public.gasto_recurrente for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create trigger trg_gasto_rec_auditoria after insert or update or delete on public.gasto_recurrente
  for each row execute function public.registrar_auditoria();

-- ── Posteo mensual automático (idempotente) ─────────────────────────────────
-- SECURITY DEFINER: lo dispara el cron (sin sesión) o un admin; escribe en el
-- ledger (solo-admin) sin importar quién invoca. Devuelve cuántos posteó.
create or replace function public.postear_gastos_recurrentes()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_mes   date := date_trunc('month', current_date)::date;
  v_count int := 0;
  r       record;
begin
  for r in
    select * from public.gasto_recurrente
    where activo and (ultimo_posteo is null or ultimo_posteo < v_mes)
  loop
    insert into public.movimiento_financiero
      (fecha, categoria, concepto, monto, origen, sucursal_id)
    values
      (v_mes, 'gasto', r.concepto, r.monto, 'gasto_recurrente', r.sucursal_id);
    update public.gasto_recurrente set ultimo_posteo = v_mes where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- El cron (service_role) y los admins pueden invocarla.
grant execute on function public.postear_gastos_recurrentes() to authenticated, service_role;
