-- ═══════════════════════════════════════════════════════════════════════════
-- promover_admins.sql — da rol admin a los usuarios fundadores por correo.
--
-- CÓMO USARLO (Santiago):
--   1. En el panel de Supabase: Authentication → Users → Add user.
--      Crea (si no existen) los dos usuarios con "Auto Confirm User" activado:
--        · fgzz01@outlook.com
--        · santiagordz0920@gmail.com
--   2. En SQL Editor, pega este archivo completo y presiona Run.
--   3. La consulta final debe regresar 2 filas con rol = 'admin'.
--
-- Es seguro correrlo más de una vez (idempotente). Si el perfil en
-- public.usuario aún no existe (p. ej. el usuario se creó antes de aplicar la
-- migración 0002), aquí se crea; si ya existe, solo se promueve a admin.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.usuario (id, nombre, rol)
select
  au.id,
  coalesce(au.raw_user_meta_data->>'nombre', split_part(au.email, '@', 1)),
  'admin'
from auth.users au
where lower(au.email) in ('fgzz01@outlook.com', 'santiagordz0920@gmail.com')
on conflict (id) do update set rol = 'admin', activo = true;

-- Verificación: 2 filas, ambas con rol = 'admin' y activo = true.
select au.email, u.nombre, u.rol, u.activo
from public.usuario u
join auth.users au on au.id = u.id
where lower(au.email) in ('fgzz01@outlook.com', 'santiagordz0920@gmail.com');
