-- ═══════════════════════════════════════════════════════════════════════════
-- 0025_tareas_seguimiento — Fase 4
-- Cron nocturno de seguimiento (§4). Genera tareas automáticas para dos avisos
-- que hoy dependían de que alguien se acordara:
--   1) Atasco de producción: una orden ≥7 días en la misma etapa (no entregada).
--   2) Contrato sin firmar: un contrato enviado hace >48 h y aún sin firma.
--
-- IDEMPOTENTE: no crea una tarea nueva cada noche. Antes de insertar verifica que
-- no exista ya una tarea PENDIENTE de seguimiento para ese pedido (por prefijo de
-- título). Así el cron puede correr todas las noches sin duplicar. La tarea se
-- liga al pedido (`entidad_tipo='pedido'`) porque no hay entidad de producción/
-- documento en el enum; `origen='sugerida'`, prioridad alta.
--
-- SECURITY DEFINER (+ search_path) porque el cron corre con service_role sin
-- sesión y necesita insertar en `tarea` derivando sucursal del propio registro.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.generar_tareas_seguimiento()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  n_atasco int := 0;
  n_contrato int := 0;
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

  return n_atasco + n_contrato;
end;
$$;

grant execute on function public.generar_tareas_seguimiento() to authenticated, service_role;
