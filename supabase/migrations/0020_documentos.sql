-- ═══════════════════════════════════════════════════════════════════════════
-- 0020_documentos — Fase 4
-- Archivado + e-firma de documentos (§3.12). El contrato/nota se genera desde el
-- pedido; aquí se PERSISTE el documento para archivarlo en la ficha, versionarlo
-- y capturar la firma del cliente con evidencia (firma simple: nombre + fecha/
-- hora + user-agent; el trazo en canvas es una mejora posterior).
--
-- Firma pública: el cliente abre /firmar/[token] SIN cuenta. El token es la
-- llave. Esa ruta lee/escribe con el cliente service_role (bypassa RLS por
-- token); por eso la RLS de la tabla es solo para el equipo (sucursal).
-- ═══════════════════════════════════════════════════════════════════════════

create type public.tipo_documento as enum ('contrato', 'nota_remision', 'adenda');
create type public.estado_documento as enum ('borrador', 'enviado', 'firmado', 'cancelado');

create table public.documento (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references public.pedido(id) on delete cascade,
  tipo           public.tipo_documento not null default 'contrato',
  token          text not null unique,             -- llave de la liga de firma
  estado         public.estado_documento not null default 'borrador',
  version        int not null default 1,
  firmado_por    text,                             -- nombre que firmó
  firmado_at     timestamptz,
  evidencia      jsonb,                            -- {user_agent, ...}
  sucursal_id    uuid not null references public.sucursal(id)
                   default '00000000-0000-0000-0000-000000000001',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_documento_pedido on public.documento (pedido_id, created_at desc);
create index idx_documento_estado on public.documento (estado);

create trigger trg_documento_updated_at before update on public.documento
  for each row execute function public.tocar_updated_at();

-- ── RLS: el equipo por sucursal. La firma pública NO usa estas policies:
--     va por service_role (admin client) validando el token. ─────────────────
alter table public.documento enable row level security;
create policy "documento_select" on public.documento for select to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual());
create policy "documento_write" on public.documento for all to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());

-- ── Auditoría ───────────────────────────────────────────────────────────────
create trigger trg_documento_auditoria after insert or update or delete on public.documento
  for each row execute function public.registrar_auditoria();
