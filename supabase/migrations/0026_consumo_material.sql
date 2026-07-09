-- ═══════════════════════════════════════════════════════════════════════════
-- 0026_consumo_material — Fase 4 (cierre)
-- Matriz §4, fila "Pieza reservada/consumida": cuando el taller CONSUME un item
-- de inventario reservado (la piedra/montura entra en la pieza), el item pasa
-- a estado 'consumido' y su costo entra al costo_real del pedido.
--
-- El estado 'consumido' y la liga item_inventario.pedido_id YA existen (0005).
-- Lo que falta es que el costo del item consumido SUME al costo_real del pedido.
-- Hasta ahora costo_real = Σ costo_produccion (0019). Aquí lo ampliamos a:
--   costo_real = Σ costo_produccion(del pedido) + Σ item_costo(items consumidos).
--
-- item_costo es SOLO-ADMIN (RLS). El recompute corre SECURITY DEFINER para leer
-- el costo sin exponerlo: el valor nunca sale a la UI del taller, solo alimenta
-- pedido_costo (que ya es solo-admin). Reusa el candado de margen existente.
--
-- La CxP a consignante NO se toca aquí: ya se crea al RESERVAR (0011); consumir
-- no la duplica.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Recompute único del costo_real (producción + material consumido) ─────────
create or replace function public.recomputar_costo_real(v_pedido uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_prod numeric(12,2);
  v_mat  numeric(12,2);
begin
  if v_pedido is null then return; end if;
  -- Costos de producción capturados por el taller (casting, engaste, …).
  select coalesce(sum(cp.monto), 0) into v_prod
    from public.costo_produccion cp
    join public.orden_produccion op on op.id = cp.orden_id
    where op.pedido_id = v_pedido;
  -- Costo de los items de inventario CONSUMIDOS por este pedido (solo-admin).
  select coalesce(sum(ic.costo), 0) into v_mat
    from public.item_inventario ii
    join public.item_costo ic on ic.item_id = ii.id
    where ii.pedido_id = v_pedido and ii.estado = 'consumido';
  insert into public.pedido_costo (pedido_id, costo_real)
    values (v_pedido, v_prod + v_mat)
    on conflict (pedido_id) do update set costo_real = excluded.costo_real;
end $$;

-- ── El trigger de costo_produccion ahora delega en el recompute único ────────
create or replace function public.sumar_costo_produccion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_orden  uuid := coalesce(new.orden_id, old.orden_id);
  v_pedido uuid;
begin
  select pedido_id into v_pedido from public.orden_produccion where id = v_orden;
  perform public.recomputar_costo_real(v_pedido);
  return coalesce(new, old);
end $$;

-- ── Nuevo: cambios en item_inventario (consumo/liberación) → recompute ───────
-- Recompute idempotente; si el item no está ligado a un pedido, no hace nada.
create or replace function public.recomputar_por_item_inventario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.recomputar_costo_real(old.pedido_id);
    return old;
  end if;
  -- Si el item cambió de pedido, recomputa también el pedido anterior.
  if tg_op = 'UPDATE' and old.pedido_id is distinct from new.pedido_id then
    perform public.recomputar_costo_real(old.pedido_id);
  end if;
  perform public.recomputar_costo_real(new.pedido_id);
  return new;
end $$;

create trigger trg_item_inventario_costo_real
  after insert or update or delete on public.item_inventario
  for each row execute function public.recomputar_por_item_inventario();
