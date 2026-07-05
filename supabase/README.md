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

## Migraciones Fase 1

| Archivo | Qué crea |
|---|---|
| `0004_clientes.sql` | CRM: `cliente` + `nota_cliente`, enums de canal y pipeline |
| `0005_inventario.sql` | `item_inventario` + `item_costo` (solo-admin) + `consignante` |
| `0006_auditoria_generica.sql` | Fix de `registrar_auditoria()` para PK que no se llama `id` |
| `0007_cotizador.sql` | `precio_metal`, `cotizacion` + líneas + `cotizacion_margen` (solo-admin) |
| `0008_pedidos.sql` | `pedido`, `pago`, `pedido_costo` (solo-admin); candado de anticipo 2 |
| `0009_tareas.sql` | `tarea` (vinculable a entidad); alimenta el Dashboard "Hoy" |

> Atajos para aplicar en el SQL Editor sin la CLI: `supabase/aplicar_0004_a_0008.sql`
> (base nueva) o `supabase/aplicar_0005_a_0008.sql` (si 0004 ya estaba aplicado).
> `0009` se aplica por separado con su `.sql`.

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
6. Registrar a Santiago y Fer (Authentication → Add user), y promoverlos a admin:
   ```sql
   update public.usuario set rol = 'admin' where id = '<uuid-del-usuario>';
   ```

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
