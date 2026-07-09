-- ═══════════════════════════════════════════════════════════════════════════
-- 0027_sugerencia_cotizacion — Fase 5 (tareas sugeridas por IA, paso 1)
-- Amplía el cron nocturno `generar_tareas_seguimiento` (0025) con un tercer
-- tipo de tarea sugerida (§3.15 "sugeridas por IA": cotización sin respuesta):
--   3) Cotización ENVIADA que sigue sin respuesta ≥5 días → tarea de seguimiento.
--
-- Cierra la fila §4 "Cotización enviada → Tareas programa seguimiento".
-- Proxy de "sin respuesta": estado sigue en 'enviada' (no pasó a 'seguimiento'/
-- 'aceptada'/'vencida') y no se toca (updated_at) desde hace ≥5 días.
--
-- Mismo patrón que 0025: IDEMPOTENTE (no duplica si ya hay una tarea pendiente
-- para esa cotización), SECURITY DEFINER, tarea ligada a la cotización
-- (entidad_tipo='cotizacion' — el enum ya lo permite), origen='sugerida'.
-- Se redefine la función completa para mantener un solo cron nocturno.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.generar_tareas_seguimiento()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  n_atasco int := 0;
  n_contrato int := 0;
  n_cotizacion int := 0;
begin
  -- ── 1) Atasco de producción (≥7 días en la etapa, no listo_entrega) ────────
  insert into public.tarea
    (titulo, detalle, responsable_id, prioridad, entidad_tipo, entidad_id, origen, sucursal_id)
  select
    'Atasco en producción: ' || coalesce(c.nombre, 'cliente'),
    'La orden lleva ' ||
      floor(extract(epoch from (now() - op.updated_at)) / 86400)::int ||
      ' días en la etapa "' ||
      case op.etapa
        when 'diseno' then 'Diseño'
        when 'cad' then 'CAD'
        when 'aprobacion_cliente' then 'Aprobación cliente'
        when 'casting' then 'Casting'
        when 'engaste' then 'Engaste'
        when 'pulido' then 'Pulido'
        when 'qc' then 'QC'
        when 'listo_entrega' then 'Listo para entrega'
      end ||
      '". Da seguimiento con el taller.',
    op.responsable_id,
    'alta',
    'pedido',
    op.pedido_id,
    'sugerida',
    op.sucursal_id
  from public.orden_produccion op
  join public.pedido p on p.id = op.pedido_id
  left join public.cliente c on c.id = p.cliente_id
  where op.etapa <> 'listo_entrega'
    and op.updated_at < now() - interval '7 days'
    and not exists (
      select 1 from public.tarea t
      where t.entidad_tipo = 'pedido'
        and t.entidad_id = op.pedido_id
        and t.estado = 'pendiente'
        and t.titulo like 'Atasco en producción:%'
    );
  get diagnostics n_atasco = row_count;

  -- ── 2) Contrato sin firmar (>48 h en estado 'enviado') ─────────────────────
  insert into public.tarea
    (titulo, detalle, responsable_id, prioridad, entidad_tipo, entidad_id, origen, sucursal_id)
  select
    'Contrato sin firmar: ' || coalesce(c.nombre, 'cliente'),
    'El contrato se envió hace más de 48 h y sigue sin firma. Dale seguimiento al cliente para cerrarlo.',
    null,
    'alta',
    'pedido',
    d.pedido_id,
    'sugerida',
    d.sucursal_id
  from public.documento d
  join public.pedido p on p.id = d.pedido_id
  left join public.cliente c on c.id = p.cliente_id
  where d.tipo = 'contrato'
    and d.estado = 'enviado'
    and d.created_at < now() - interval '48 hours'
    and not exists (
      select 1 from public.tarea t
      where t.entidad_tipo = 'pedido'
        and t.entidad_id = d.pedido_id
        and t.estado = 'pendiente'
        and t.titulo like 'Contrato sin firmar:%'
    );
  get diagnostics n_contrato = row_count;

  -- ── 3) Cotización enviada sin respuesta (≥5 días en 'enviada') ─────────────
  insert into public.tarea
    (titulo, detalle, responsable_id, prioridad, entidad_tipo, entidad_id, origen, sucursal_id)
  select
    'Cotización sin respuesta: ' || coalesce(c.nombre, 'cliente'),
    'La cotización se envió hace ' ||
      floor(extract(epoch from (now() - cot.updated_at)) / 86400)::int ||
      ' días y sigue sin respuesta. Da seguimiento al cliente (una llamada o mensaje suele reactivar el cierre).',
    null,
    'media',
    'cotizacion',
    cot.id,
    'sugerida',
    cot.sucursal_id
  from public.cotizacion cot
  left join public.cliente c on c.id = cot.cliente_id
  where cot.estado = 'enviada'
    and cot.updated_at < now() - interval '5 days'
    and not exists (
      select 1 from public.tarea t
      where t.entidad_tipo = 'cotizacion'
        and t.entidad_id = cot.id
        and t.estado = 'pendiente'
        and t.titulo like 'Cotización sin respuesta:%'
    );
  get diagnostics n_cotizacion = row_count;

  return n_atasco + n_contrato + n_cotizacion;
end;
$$;

grant execute on function public.generar_tareas_seguimiento() to authenticated, service_role;
