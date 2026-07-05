-- ═══════════════════════════════════════════════════════════════════════════
-- 0006_auditoria_generica — Fase 1
-- Arregla registrar_auditoria() para tablas cuya llave primaria no se llama
-- "id" (p.ej. item_costo.item_id). Deriva la PK del catálogo, sin hardcodear.
-- Reemplaza la versión de 0003 (create or replace); los triggers no cambian.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.registrar_auditoria()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) else null end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) else null end;
  v_rec jsonb := coalesce(v_new, v_old);
  v_pk  text;
  v_id  text;
begin
  -- Primera columna de la llave primaria de la tabla que disparó el trigger.
  select a.attname into v_pk
  from pg_index i
  join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
  where i.indrelid = tg_relid and i.indisprimary
  order by array_position(i.indkey, a.attnum)
  limit 1;

  v_id := coalesce(v_rec ->> v_pk, 'desconocido');

  insert into public.auditoria (tabla, registro_id, accion, usuario_id, datos_antes, datos_despues)
  values (tg_table_name, v_id, tg_op, auth.uid(), v_old, v_new);

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
