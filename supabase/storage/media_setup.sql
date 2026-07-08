-- ═══════════════════════════════════════════════════════════════════════════
-- Storage · bucket `media` (Biblioteca de media, §3.8)
-- Correr UNA vez en el SQL Editor de Supabase (NO va en el glob de migraciones
-- porque toca el esquema `storage`, que el Postgres local de validación no tiene).
--
-- Bucket PRIVADO: los archivos no son públicos; la app genera URLs firmadas de
-- corta vida para mostrarlos/compartirlos. Así una foto de una pieza de un
-- cliente no queda expuesta en una URL adivinable.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Bucket privado.
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

-- 2) Policies sobre storage.objects para el bucket `media`.
--    Sólo usuarios autenticados; la partición por sucursal se maneja en la
--    tabla public.media (índice con metadatos). El acceso al archivo va por URL
--    firmada generada en el servidor, así que basta con exigir sesión.

drop policy if exists "media_leer" on storage.objects;
create policy "media_leer" on storage.objects for select to authenticated
  using (bucket_id = 'media');

drop policy if exists "media_subir" on storage.objects;
create policy "media_subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'media');

drop policy if exists "media_borrar" on storage.objects;
create policy "media_borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'media');
