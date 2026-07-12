-- ═══════════════════════════════════════════════════════════════════════════
-- 0036_contactos_utiles — Directorio de contactos para tercerizar procesos
-- Joyeros, vaciadores, montadores y demás oficios externos a los que Aurelle
-- puede mandar trabajo. Todo opcional salvo el nombre: es data para enriquecer,
-- no un registro contable. Visible para TODOS los usuarios (no es solo-admin:
-- los precios son estimados de terceros, no finanzas ni márgenes de Aurelle).
-- Vive en /taller/contactos. Difiere de `proveedor` (0012): aquél es a quién
-- se le COMPRA (Dinero, CxP, solo-admin); éste es a quién se le puede
-- ENCARGAR un proceso (Taller, operativo).
-- ═══════════════════════════════════════════════════════════════════════════

create table public.contacto_util (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  tipo            text not null default 'otro'
                    check (tipo in ('joyero', 'vaciador', 'montador', 'otro')),
  contacto        text,                -- teléfono / WhatsApp / correo, texto libre
  especialidad    text,                -- "micropavé y halo", "cera perdida en platino"…
  tiempo_entrega  text,                -- "3-5 días hábiles"
  precio_estimado text,                -- "desde $800/pieza", "por gramo"… informal
  notas           text,
  sucursal_id     uuid not null references public.sucursal(id)
                    default '00000000-0000-0000-0000-000000000001',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_contacto_util_nombre_lower on public.contacto_util (lower(nombre));
create index idx_contacto_util_tipo on public.contacto_util (tipo);

create trigger trg_contacto_util_updated_at before update on public.contacto_util
  for each row execute function public.tocar_updated_at();

-- ── RLS: todos los usuarios autenticados, por sucursal (admin ve todo) ───────
alter table public.contacto_util enable row level security;
create policy "contacto_util_select" on public.contacto_util for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "contacto_util_write" on public.contacto_util for all to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());

-- ── Auditoría ────────────────────────────────────────────────────────────────
create trigger trg_contacto_util_auditoria
  after insert or update or delete on public.contacto_util
  for each row execute function public.registrar_auditoria();
