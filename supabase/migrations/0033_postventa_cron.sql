-- ═══════════════════════════════════════════════════════════════════════════
-- 0033_postventa_cron — Fase 6 (Postventa v2, §3.7 lifecycle)
-- El cron nocturno sugiere tareas de contacto de postventa (oportunidades de
-- recompra/fidelización). El ENVÍO por WhatsApp espera el riel; aquí quedan las
-- tareas para contacto manual, en la misma mecánica de sugerencias.
--   A) Garantía por vencer (≤30 días): invitar a revisión/limpieza.
--   B) Aniversario de ENTREGA próximo (≤14 días): limpieza anual gratis / recompra.
--   C) Aniversario de BODA próximo (≤14 días): felicitación / campaña churumbela.
--
-- Función APARTE (el route del cron ya llama seguimiento + recurrentes; suma esta).
-- Idempotente: no duplica si ya hay tarea pendiente del mismo tipo para el cliente
-- (incluye descartadas, que siguen 'pendiente' → no re-molesta si el usuario dijo
-- que no). Aniversarios: match por mes-día en la ventana (sin make_date → sin
-- problemas de 29-feb). Tarea sugerida ligada al cliente.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.generar_tareas_postventa()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  n_garantia int := 0;
  n_entrega int := 0;
  n_boda int := 0;
begin
  -- ── A) Garantía por vencer (≤30 días, no vencida) ──────────────────────────
  insert into public.tarea
    (titulo, detalle, responsable_id, prioridad, entidad_tipo, entidad_id, origen, sucursal_id)
  select
    'Garantía por vencer: ' || coalesce(c.nombre, 'cliente'),
    'La garantía de la pieza vence el ' || to_char(pe.garantia_hasta, 'DD/MM/YYYY') ||
      '. Buen momento para invitar a una revisión o limpieza (y sembrar la próxima venta).',
    null, 'media', 'cliente', pe.cliente_id, 'sugerida', pe.sucursal_id
  from public.pieza_entregada pe
  left join public.cliente c on c.id = pe.cliente_id
  where pe.cliente_id is not null
    and pe.garantia_hasta is not null
    and pe.garantia_hasta between current_date and current_date + 30
    and not exists (
      select 1 from public.tarea t
      where t.entidad_tipo = 'cliente' and t.entidad_id = pe.cliente_id
        and t.estado = 'pendiente' and t.titulo like 'Garantía por vencer:%');
  get diagnostics n_garantia = row_count;

  -- ── B) Aniversario de entrega próximo (≤14 días, mes-día) ──────────────────
  insert into public.tarea
    (titulo, detalle, responsable_id, prioridad, entidad_tipo, entidad_id, origen, sucursal_id)
  select
    'Aniversario de entrega: ' || coalesce(c.nombre, 'cliente'),
    'Se acerca el aniversario de la entrega. Invita a la limpieza anual de cortesía y da seguimiento de recompra.',
    null, 'media', 'cliente', pe.cliente_id, 'sugerida', pe.sucursal_id
  from public.pieza_entregada pe
  left join public.cliente c on c.id = pe.cliente_id
  where pe.cliente_id is not null
    and pe.aniversario_entrega is not null
    and (extract(month from pe.aniversario_entrega)::int, extract(day from pe.aniversario_entrega)::int) in (
      select extract(month from d)::int, extract(day from d)::int
      from generate_series(current_date, current_date + 14, interval '1 day') d)
    and not exists (
      select 1 from public.tarea t
      where t.entidad_tipo = 'cliente' and t.entidad_id = pe.cliente_id
        and t.estado = 'pendiente' and t.titulo like 'Aniversario de entrega:%');
  get diagnostics n_entrega = row_count;

  -- ── C) Aniversario de boda próximo (≤14 días, mes-día) ─────────────────────
  insert into public.tarea
    (titulo, detalle, responsable_id, prioridad, entidad_tipo, entidad_id, origen, sucursal_id)
  select
    'Aniversario de boda: ' || coalesce(c.nombre, 'cliente'),
    'Se acerca su aniversario de boda. Felicítalo y considera la campaña churumbela/eternity.',
    null, 'media', 'cliente', pe.cliente_id, 'sugerida', pe.sucursal_id
  from public.pieza_entregada pe
  left join public.cliente c on c.id = pe.cliente_id
  where pe.cliente_id is not null
    and pe.aniversario_boda is not null
    and (extract(month from pe.aniversario_boda)::int, extract(day from pe.aniversario_boda)::int) in (
      select extract(month from d)::int, extract(day from d)::int
      from generate_series(current_date, current_date + 14, interval '1 day') d)
    and not exists (
      select 1 from public.tarea t
      where t.entidad_tipo = 'cliente' and t.entidad_id = pe.cliente_id
        and t.estado = 'pendiente' and t.titulo like 'Aniversario de boda:%');
  get diagnostics n_boda = row_count;

  return n_garantia + n_entrega + n_boda;
end $$;

grant execute on function public.generar_tareas_postventa() to authenticated, service_role;
