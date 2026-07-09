-- ═══════════════════════════════════════════════════════════════════════════
-- 0028_umbral_stock — Fase 5 (tareas sugeridas por IA, paso 2)
-- Alerta de stock bajo (§3.6 + matriz §4 "Stock bajo → Notificación; Tarea").
-- El admin define un MÍNIMO de piezas disponibles por categoría (tipo de item);
-- el cron nocturno cuenta los disponibles y, si están por debajo del mínimo,
-- crea una tarea sugerida (recompra). Un solo cron para todas las sugerencias.
--
-- Umbral por `tipo` (la dimensión estructurada que existe). Categorías más finas
-- ("solitario oro blanco") viven en nombre/descripcion; se pueden refinar después.
-- Config editable por admin: escritura solo-admin, lectura por sucursal.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.umbral_stock (
  tipo        public.tipo_item not null,
  minimo      int not null check (minimo >= 0),
  sucursal_id uuid not null references public.sucursal(id)
                default '00000000-0000-0000-0000-000000000001',
  updated_at  timestamptz not null default now(),
  primary key (tipo, sucursal_id)
);

create trigger trg_umbral_stock_updated_at before update on public.umbral_stock
  for each row execute function public.tocar_updated_at();

alter table public.umbral_stock enable row level security;
-- Lectura: el equipo por sucursal (para ver la config y el estado de stock).
create policy "umbral_select" on public.umbral_stock for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
-- Escritura: SOLO admin (es configuración del negocio).
create policy "umbral_write" on public.umbral_stock for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create trigger trg_umbral_auditoria
  after insert or update or delete on public.umbral_stock
  for each row execute function public.registrar_auditoria();

-- ── Cron nocturno: se redefine con un 4º bloque (stock bajo) ─────────────────
create or replace function public.generar_tareas_seguimiento()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  n_atasco int := 0;
  n_contrato int := 0;
  n_cotizacion int := 0;
  n_stock int := 0;
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

  -- ── 4) Stock bajo (disponibles del tipo < mínimo configurado) ──────────────
  -- Tarea SIN entidad (es sobre una categoría, no un item); idempotente por título.
  with bajos as (
    select
      u.tipo, u.minimo, u.sucursal_id,
      (select count(*) from public.item_inventario ii
         where ii.tipo = u.tipo
           and ii.sucursal_id = u.sucursal_id
           and ii.estado = 'disponible') as disponibles,
      case u.tipo
        when 'piedra_color' then 'Piedras de color'
        when 'diamante' then 'Diamantes'
        when 'montura' then 'Monturas'
        when 'pieza_terminada' then 'Piezas terminadas'
        when 'churumbela' then 'Churumbelas'
      end as etiqueta
    from public.umbral_stock u
    where u.minimo > 0
  )
  insert into public.tarea
    (titulo, detalle, responsable_id, prioridad, entidad_tipo, entidad_id, origen, sucursal_id)
  select
    'Stock bajo: ' || b.etiqueta,
    'Quedan ' || b.disponibles || ' disponibles (mínimo ' || b.minimo ||
      '). Considera recompra con tu proveedor habitual.',
    null,
    'alta',
    null,
    null,
    'sugerida',
    b.sucursal_id
  from bajos b
  where b.disponibles < b.minimo
    and not exists (
      select 1 from public.tarea t
      where t.estado = 'pendiente'
        and t.sucursal_id = b.sucursal_id
        and t.titulo = 'Stock bajo: ' || b.etiqueta
    );
  get diagnostics n_stock = row_count;

  return n_atasco + n_contrato + n_cotizacion + n_stock;
end;
$$;

grant execute on function public.generar_tareas_seguimiento() to authenticated, service_role;
