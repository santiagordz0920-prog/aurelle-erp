-- ═══════════════════════════════════════════════════════════════════════════
-- 0037_contactos_utiles — Contactos del gremio para tercerizar procesos
-- (pedido de Santiago 2026-07-11). Directorio de joyeros, vaciadores,
-- montadores, etc. con especialidad, tiempo de entrega y precios estimados.
-- Nada obligatorio salvo el nombre: es data de referencia que se enriquece
-- con el tiempo. A DIFERENCIA de `proveedor` (área Dinero, SOLO-ADMIN, ligado
-- a CxP/compras), esto es operativo y debe estar A LA VISTA de todo el
-- equipo → vive bajo Taller con lectura/escritura por sucursal.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.contacto_util (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  tipo              text,            -- joyero / vaciador / montador / grabador / otro (libre)
  contacto          text,            -- teléfono, WhatsApp o correo, texto libre
  especialidad      text,            -- "filigrana", "vaciado en platino", …
  tiempo_entrega    text,            -- "3-5 días hábiles"
  precios_estimados text,            -- "$800-1,200 por montada" (referencia, no tarifa)
  notas             text,
  sucursal_id       uuid not null references public.sucursal(id)
                      default '00000000-0000-0000-0000-000000000001',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_contacto_util_nombre_lower on public.contacto_util (lower(nombre));
create index idx_contacto_util_tipo on public.contacto_util (tipo);

create trigger trg_contacto_util_updated_at before update on public.contacto_util
  for each row execute function public.tocar_updated_at();

-- RLS: todo el equipo de la sucursal lee y escribe (el punto es tenerlo a la
-- mano al tercerizar); admin ve todo.
alter table public.contacto_util enable row level security;
create policy "contacto_util_rw" on public.contacto_util for all to authenticated
  using (public.es_admin() or sucursal_id = public.sucursal_actual())
  with check (public.es_admin() or sucursal_id = public.sucursal_actual());

create trigger trg_contacto_util_auditoria
  after insert or update or delete on public.contacto_util
  for each row execute function public.registrar_auditoria();
