-- ═══════════════════════════════════════════════════════════════════════════
-- 0031_tarea_descartada — Fase 5 (§3.15: aceptar/descartar sugerencias "en un toque")
-- DESCARTAR una tarea sugerida no la borra: la oculta de la UI pero la deja en
-- estado='pendiente'. Así el cron de sugerencias (`generar_tareas_seguimiento`,
-- idempotente por titulo + estado='pendiente') NO la vuelve a crear cada noche.
-- ACEPTAR una sugerencia = `origen` pasa de 'sugerida' a 'manual' (app-level):
-- se vuelve una tarea normal ("mis tareas"). Ambas son UPDATE sobre `tarea`
-- (RLS por sucursal ya existente).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.tarea
  add column if not exists descartada boolean not null default false;

-- Índice parcial: solo las descartadas (pocas) para filtrarlas rápido.
create index if not exists idx_tarea_descartada on public.tarea (descartada)
  where descartada;
