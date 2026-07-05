-- ═══════════════════════════════════════════════════════════════════════════
-- 0003_auditoria — Fase 0
-- Registro de auditoría (§1): toda escritura importante guarda quién y cuándo.
-- Un trigger genérico reutilizable que se ADJUNTA a cada tabla sensible.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.auditoria (
  id            bigint generated always as identity primary key,
  tabla         text not null,
  registro_id   text not null,
  accion        text not null check (accion in ('INSERT', 'UPDATE', 'DELETE')),
  usuario_id    uuid,                 -- auth.uid() al momento del cambio
  datos_antes   jsonb,
  datos_despues jsonb,
  created_at    timestamptz not null default now()
);

create index idx_auditoria_tabla_registro on public.auditoria (tabla, registro_id);
create index idx_auditoria_created_at on public.auditoria (created_at desc);

-- ── Trigger genérico de auditoría ───────────────────────────────────────────
-- SECURITY DEFINER para poder escribir en auditoria saltando su RLS.
-- Uso: create trigger trg_<tabla>_auditoria
--        after insert or update or delete on public.<tabla>
--        for each row execute function public.registrar_auditoria();
create or replace function public.registrar_auditoria()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_id text;
begin
  v_id := coalesce(
    (case when tg_op = 'DELETE' then old.id else new.id end)::text,
    'desconocido'
  );

  insert into public.auditoria (tabla, registro_id, accion, usuario_id, datos_antes, datos_despues)
  values (
    tg_table_name,
    v_id,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- ── RLS: la auditoría es solo-lectura y solo para admin ─────────────────────
alter table public.auditoria enable row level security;

create policy "auditoria_select_admin"
  on public.auditoria for select
  to authenticated
  using (public.es_admin());
-- Sin policies de insert/update/delete: nadie escribe directo. Solo el trigger
-- (SECURITY DEFINER) inserta; nadie puede borrar ni alterar el historial.

-- ── Adjuntar auditoría a las tablas de Fase 0 ───────────────────────────────
create trigger trg_usuario_auditoria
  after insert or update or delete on public.usuario
  for each row execute function public.registrar_auditoria();

create trigger trg_sucursal_auditoria
  after insert or update or delete on public.sucursal
  for each row execute function public.registrar_auditoria();
