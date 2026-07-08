-- ═══════════════════════════════════════════════════════════════════════════
-- 0024_clausulas_contrato — Fase 4
-- Cláusulas legales del contrato editables desde la app (§3.12). Antes, el texto
-- legal (Anticipos, Garantía, Especificaciones) vivía hardcodeado en el
-- componente `<ContratoDoc>`. Ahora se guardan en tabla para que Santiago las
-- edite sin tocar código: agregar, editar, reordenar, activar/desactivar.
--
-- Integridad legal: al FIRMAR, las cláusulas vigentes se congelan en el snapshot
-- del contrato (documento.contenido, 0022). Editar una cláusula después NO altera
-- un contrato ya firmado.
--
-- Escritura SOLO admin (texto legal del negocio). Lectura para el equipo por
-- sucursal (ventas imprime/genera el contrato). La firma pública lee por
-- service_role. La semilla replica las cláusulas que estaban en código.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.clausula_contrato (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  cuerpo       text not null,
  posicion     int not null default 0,
  activo       boolean not null default true,
  sucursal_id  uuid not null references public.sucursal(id)
                 default '00000000-0000-0000-0000-000000000001',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_clausula_contrato_pos on public.clausula_contrato (posicion);

create trigger trg_clausula_contrato_updated_at before update on public.clausula_contrato
  for each row execute function public.tocar_updated_at();

-- ── RLS: lectura del equipo por sucursal; escritura SOLO admin ───────────────
alter table public.clausula_contrato enable row level security;
create policy "clausula_contrato_select" on public.clausula_contrato for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "clausula_contrato_write" on public.clausula_contrato for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_clausula_contrato_auditoria after insert or update or delete on public.clausula_contrato
  for each row execute function public.registrar_auditoria();

-- ── Semilla: las cláusulas que vivían en <ContratoDoc> ───────────────────────
insert into public.clausula_contrato (posicion, titulo, cuerpo) values
  (0, 'Anticipos', 'La fabricación inicia una vez cubierto el anticipo convenido; la compra de materiales requiere el anticipo del 30%. El saldo se liquida antes de la entrega.'),
  (1, 'Garantía', 'La pieza cuenta con garantía de por vida contra defectos de fabricación y servicio de limpieza y pulido sin costo. No cubre daño por mal uso.'),
  (2, 'Especificaciones', 'Las piedras y características corresponden a la cotización aceptada; cualquier cambio se documenta como adenda.');
