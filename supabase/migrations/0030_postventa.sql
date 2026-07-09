-- ═══════════════════════════════════════════════════════════════════════════
-- 0030_postventa — Fase 6 (Postventa, §3.7)
-- Convierte cada entrega en la siguiente venta. Al entregar un pedido se crea el
-- registro de pieza entregada (garantía + aniversarios); los servicios (limpieza,
-- ajuste, reparación…) quedan en el historial de la pieza.
--
-- El registro se crea app-level en `entregarPedido` (matriz §4 "Pedido entregado
-- → Postventa"), idempotente por `pedido_id` único. RLS por sucursal (operativo,
-- lo ve ventas/taller/admin) — no lleva costo/margen secreto.
-- ═══════════════════════════════════════════════════════════════════════════

create type public.tipo_servicio as enum (
  'limpieza', 'ajuste_talla', 'reparacion', 'rerodinado', 'otro'
);

-- ── pieza_entregada (1:1 con pedido) ────────────────────────────────────────
create table public.pieza_entregada (
  id                  uuid primary key default gen_random_uuid(),
  pedido_id           uuid not null unique references public.pedido(id) on delete cascade,
  cliente_id          uuid references public.cliente(id) on delete set null,
  entregada_at        timestamptz not null default now(),
  garantia_meses      int not null default 12 check (garantia_meses >= 0),
  garantia_hasta      date,               -- entregada + garantía (para "por vencer")
  aniversario_entrega date,               -- fecha de entrega (recurre anual: recompra/limpieza)
  aniversario_boda    date,               -- de cliente.fecha_boda al entregar (si existe)
  notas               text,
  sucursal_id         uuid not null references public.sucursal(id)
                        default '00000000-0000-0000-0000-000000000001',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index idx_pieza_cliente on public.pieza_entregada (cliente_id);
create index idx_pieza_garantia on public.pieza_entregada (garantia_hasta);

create trigger trg_pieza_updated_at before update on public.pieza_entregada
  for each row execute function public.tocar_updated_at();

-- ── servicio_pieza (historial de servicios) ─────────────────────────────────
create table public.servicio_pieza (
  id             uuid primary key default gen_random_uuid(),
  pieza_id       uuid not null references public.pieza_entregada(id) on delete cascade,
  tipo           public.tipo_servicio not null default 'limpieza',
  descripcion    text,
  costo          numeric(12,2) not null default 0 check (costo >= 0),  -- 0 = cortesía
  fecha          date not null default current_date,
  registrado_por uuid references public.usuario(id),
  created_at     timestamptz not null default now()
);
create index idx_servicio_pieza on public.servicio_pieza (pieza_id, fecha);

-- ── RLS (por sucursal; operativo) ───────────────────────────────────────────
alter table public.pieza_entregada enable row level security;
create policy "pieza_select" on public.pieza_entregada for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "pieza_write" on public.pieza_entregada for all to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());

alter table public.servicio_pieza enable row level security;
create policy "servicio_all" on public.servicio_pieza for all to authenticated
  using (exists (select 1 from public.pieza_entregada pe where pe.id = pieza_id
    and (public.es_admin() or pe.sucursal_id = public.sucursal_actual())))
  with check (exists (select 1 from public.pieza_entregada pe where pe.id = pieza_id
    and (public.es_admin() or pe.sucursal_id = public.sucursal_actual())));

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_pieza_auditoria after insert or update or delete on public.pieza_entregada
  for each row execute function public.registrar_auditoria();
create trigger trg_servicio_auditoria after insert or update or delete on public.servicio_pieza
  for each row execute function public.registrar_auditoria();
