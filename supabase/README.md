# Supabase — base de datos del ERP

El esquema vive como **migraciones versionadas** en `supabase/migrations/`. Nunca
se hacen cambios manuales directos en producción (regla de `CLAUDE.md`): todo
cambio de esquema es una migración nueva con número consecutivo.

## Migraciones actuales (Fase 0)

| Archivo | Qué crea |
|---|---|
| `0001_fundaciones.sql` | Extensiones, helper `tocar_updated_at()`, tabla `sucursal` (seed: Ellion), RLS de lectura |
| `0002_usuarios_roles.sql` | Enum `rol`, tabla `usuario`, helpers `es_admin()` / `rol_actual()` / `sucursal_actual()`, alta automática de perfil al registrarse, RLS por rol |
| `0003_auditoria.sql` | Tabla `auditoria`, trigger genérico `registrar_auditoria()`, RLS solo-admin, adjunto a `usuario` y `sucursal` |

## Puesta en marcha (lo hace Santiago una vez)

1. Crear un proyecto en [supabase.com](https://supabase.com) (región cercana a México).
2. Instalar la CLI: `npm i -g supabase` (o `brew install supabase/tap/supabase`).
3. Enlazar el repo con el proyecto:
   ```bash
   supabase login
   supabase link --project-ref <TU-PROJECT-REF>
   ```
4. Aplicar las migraciones a la nube:
   ```bash
   supabase db push
   ```
5. Copiar las llaves del proyecto (Project Settings → API) a `.env.local` del
   repo y a las variables de entorno de Vercel (ver `.env.example`).
6. Registrar a los admins (Authentication → Add user, con Auto Confirm) y
   promoverlos corriendo `supabase/scripts/promover_admins.sql` en el SQL
   Editor (promueve por correo; es idempotente). Para promover otro correo a
   futuro, el equivalente manual es:
   ```sql
   update public.usuario u set rol = 'admin'
   from auth.users au
   where au.id = u.id and lower(au.email) = '<correo>';
   ```

## Scripts operativos (`supabase/scripts/`)

No son migraciones: son utilidades que Santiago corre a mano en el SQL Editor.

| Archivo | Qué hace |
|---|---|
| `scripts/promover_admins.sql` | Da rol `admin` a fgzz01@outlook.com y santiagordz0920@gmail.com (deben existir primero en Authentication → Users) |

## Verificación local (opcional, para desarrollo)

`supabase start` levanta un Supabase completo en Docker y aplica las migraciones.
Las migraciones de Fase 0 se verificaron aplicándolas sobre PostgreSQL 16 con un
stub del esquema `auth`; la RLS se probó con tres usuarios (dos admin, un
vendedor) confirmando que el rol `ventas` no puede leer otros perfiles ni la
auditoría.

## Convención para migraciones nuevas

- Numeración consecutiva de 4 dígitos + nombre en snake_case: `0004_inventario.sql`.
- Toda tabla de negocio: `id uuid`, `created_at`, `updated_at`, `sucursal_id`
  donde aplique, trigger `tocar_updated_at`, RLS activa, y trigger de auditoría
  si guarda datos sensibles. Ver la plantilla en `docs/CONVENCIONES.md`.
