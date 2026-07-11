-- 0036 — CRM de leads (feedback de Santiago 2026-07-11):
--   1) cliente.interes: qué busca el lead (resumen corto que mantiene el bot
--      de WhatsApp con cada mensaje; visible at-a-glance en /clientes).
--   2) Teléfonos guardados SIN espacios ni separadores (WhatsApp los copia con
--      espacios): se normalizan los existentes y la app normaliza al guardar.

--   3) Intake multicanal (WhatsApp/Instagram/Messenger/Expos): campos de
--      contacto correo/instagram/facebook/otro + contacto_preferido (el
--      "principal" que muestra el CRM; el resto solo quedan registrados).
--      La regla "mínimo un dato de contacto" se valida en la app (zod), no
--      con CHECK: hay clientes históricos de captura rápida solo-nombre y un
--      CHECK les bloquearía cualquier update (p. ej. cambiar etapa).

alter table public.cliente add column if not exists interes text;
comment on column public.cliente.interes is
  'Qué busca el lead (pieza, estilo, para quién/cuándo). Lo actualiza el bot de WhatsApp con cada mensaje.';

alter table public.cliente add column if not exists correo text;
alter table public.cliente add column if not exists instagram text;
alter table public.cliente add column if not exists facebook text;
alter table public.cliente add column if not exists otro_contacto text;
alter table public.cliente add column if not exists contacto_preferido text
  constraint cliente_contacto_preferido_chk
  check (contacto_preferido in ('telefono', 'correo', 'instagram', 'facebook', 'otro'));
comment on column public.cliente.contacto_preferido is
  'Método de contacto principal: es el único que se muestra en el CRM; los demás campos solo quedan registrados en la ficha.';

-- Clientes existentes con teléfono: el preferido es el teléfono.
update public.cliente
  set contacto_preferido = 'telefono'
  where contacto_preferido is null and telefono is not null;

-- Normalizar teléfonos existentes: solo dígitos y "+". Fila por fila con
-- manejo de colisión: cliente.telefono y conversacion(sucursal_id, telefono)
-- tienen índices únicos, y "81 1234 5678" podría chocar con "8112345678" ya
-- normalizado — en ese caso la fila se deja como está (se resuelve a mano,
-- son duplicados reales del mismo teléfono).
do $$
declare r record;
begin
  for r in
    select id, telefono from public.cliente
    where telefono is not null
      and telefono <> regexp_replace(telefono, '[^0-9+]', '', 'g')
  loop
    begin
      update public.cliente
        set telefono = regexp_replace(r.telefono, '[^0-9+]', '', 'g')
        where id = r.id;
    exception when unique_violation then
      null; -- duplicado real: conservar el formato viejo antes que perder la fila
    end;
  end loop;

  for r in
    select id, telefono from public.conversacion
    where telefono <> regexp_replace(telefono, '[^0-9+]', '', 'g')
  loop
    begin
      update public.conversacion
        set telefono = regexp_replace(r.telefono, '[^0-9+]', '', 'g')
        where id = r.id;
    exception when unique_violation then
      null;
    end;
  end loop;
end $$;
