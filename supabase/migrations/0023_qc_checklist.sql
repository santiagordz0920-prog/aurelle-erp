-- ═══════════════════════════════════════════════════════════════════════════
-- 0023_qc_checklist — Fase 4
-- Checklist de QC editable desde la app (§3.5). Antes, los puntos de control de
-- calidad por línea (bridal/concierge) vivían hardcodeados en el código
-- (`QC_CHECKLIST`). Ahora se guardan en tabla para que Santiago/Fer los editen
-- sin tocar código: agregar, editar, reordenar, activar/desactivar.
--
-- Escritura SOLO admin (es config del negocio). Lectura para el equipo por
-- sucursal (taller usa el checklist en el QC). La semilla replica el checklist
-- que estaba en código, para preservar el comportamiento actual.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.qc_checklist_item (
  id            uuid primary key default gen_random_uuid(),
  linea_negocio public.linea_negocio not null,
  posicion      int not null default 0,
  texto         text not null,
  activo        boolean not null default true,
  sucursal_id   uuid not null references public.sucursal(id)
                  default '00000000-0000-0000-0000-000000000001',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_qc_checklist_linea on public.qc_checklist_item (linea_negocio, posicion);

create trigger trg_qc_checklist_updated_at before update on public.qc_checklist_item
  for each row execute function public.tocar_updated_at();

-- ── RLS: lectura del equipo por sucursal; escritura SOLO admin ───────────────
alter table public.qc_checklist_item enable row level security;
create policy "qc_checklist_select" on public.qc_checklist_item for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "qc_checklist_write" on public.qc_checklist_item for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_qc_checklist_auditoria after insert or update or delete on public.qc_checklist_item
  for each row execute function public.registrar_auditoria();

-- ── Semilla: el checklist que vivía en código (QC_CHECKLIST) ─────────────────
insert into public.qc_checklist_item (linea_negocio, posicion, texto) values
  ('bridal', 0, 'Medida de talla correcta vs. pedido'),
  ('bridal', 1, 'Piedra central centrada y firme (sin juego)'),
  ('bridal', 2, 'Piedras laterales/pavé completas y parejas'),
  ('bridal', 3, 'Quilataje y color coinciden con el certificado'),
  ('bridal', 4, 'Acabado/pulido sin porosidades ni rayones'),
  ('bridal', 5, 'Grabado interior (si aplica) correcto'),
  ('bridal', 6, 'Peso final registrado'),
  ('bridal', 7, 'Limpieza final y estuche listo'),
  ('concierge', 0, 'Especificación del cliente cumplida'),
  ('concierge', 1, 'Piedras firmes y parejas'),
  ('concierge', 2, 'Acabado/pulido sin defectos'),
  ('concierge', 3, 'Medidas correctas vs. pedido'),
  ('concierge', 4, 'Limpieza final y empaque listo');
