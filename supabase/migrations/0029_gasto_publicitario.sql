-- ═══════════════════════════════════════════════════════════════════════════
-- 0029_gasto_publicitario — Fase 6 (Marketing v1, adelantada)
-- Captura manual del gasto de publicidad (§3.13) para calcular CAC. El gasto es
-- DINERO → solo-admin (misma regla que Finanzas/movimiento_financiero). La API de
-- Meta llega después; el fallback (carga manual/CSV) da valor ya.
--
-- El funnel (leads→citas→visitas→cotizaciones→cierres) se computa en la capa de
-- datos sobre tablas existentes (cliente.fuente_canal, cita.resultado, cotizacion,
-- pedido); aquí solo se agrega el GASTO para cruzar con los cierres = CAC.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.gasto_publicitario (
  id          uuid primary key default gen_random_uuid(),
  periodo     date not null,                          -- mes del gasto (1er día)
  canal       public.canal_fuente not null default 'ads',
  detalle     text,                                   -- campaña/zona (casa con cliente.fuente_detalle)
  monto       numeric(12,2) not null check (monto >= 0),
  sucursal_id uuid not null references public.sucursal(id)
                default '00000000-0000-0000-0000-000000000001',
  creado_por  uuid references public.usuario(id),
  created_at  timestamptz not null default now()
);
create index idx_gasto_pub_periodo on public.gasto_publicitario (periodo);
create index idx_gasto_pub_canal on public.gasto_publicitario (canal);

-- SOLO admin (es dinero, decisión de presupuesto).
alter table public.gasto_publicitario enable row level security;
create policy "gasto_pub_admin" on public.gasto_publicitario for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create trigger trg_gasto_pub_auditoria
  after insert or update or delete on public.gasto_publicitario
  for each row execute function public.registrar_auditoria();
