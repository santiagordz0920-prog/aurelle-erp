# Módulo: Biblioteca de media (§3.8)

> Renders, CADs y fotos de las piezas, organizados por pedido/cliente y en una
> galería general filtrable. Archivos en Supabase Storage (bucket privado).

## Estado
Construido en Fase 4. Última modificación: 2026-07-08. Migración `0021_media.sql`
+ setup de Storage `supabase/storage/media_setup.sql` (bucket + policies, se corre aparte).
Enganches con CRM/Producción ya integrados (envío por WhatsApp, foto por etapa, aprobación → etapa).

## Tablas
- `media` (0021) — índice de archivos. Columnas clave: `tipo` (render/cad/foto_etapa/foto_final/referencia/otro),
  `storage_path` (ruta en el bucket `media`), `version` + `aprobado` (versionado de renders, "v2 aprobado"),
  `etiquetas text[]` (estilo/metal/piedra, con índice GIN para el filtro de galería), y FKs nulables a
  `cliente`, `pedido`, `item_inventario`, `orden_produccion` (todas `on delete set null` — borrar un pedido
  no borra la evidencia). RLS por sucursal.
- **Storage:** bucket privado `media`. Los archivos NO son públicos; se muestran con **URLs firmadas de 1 h**
  generadas en el servidor (`createSignedUrls`). El bucket + policies de `storage.objects` van en
  `supabase/storage/media_setup.sql` (no en el glob de migraciones, porque tocan el esquema `storage` que el
  Postgres local de validación no tiene).

## Rutas / pantallas
- `/taller/biblioteca` — galería general con filtro por tipo y por etiqueta (chips). Subida general.
- Ficha del pedido → tarjeta **"Renders y fotos"** (`<MediaPedido>`): carpeta del pedido + subida + acciones.
- `/taller` → tarjeta Biblioteca ya activa.

## Capa
- `src/lib/media.ts` — tipos, `TIPO_MEDIA`, `ETIQUETAS_MEDIA` (curadas), `esImagen`, `etiquetaBonita`.
- `src/lib/data/media.ts` — `listarMedia(filtro)`, `listarMediaDePedido`; adjunta URLs firmadas (prod).
- `src/app/(app)/taller/biblioteca/actions.ts` — `subirMedia` (Storage upload + insert, con rollback del
  archivo si la fila falla), `alternarAprobado`, `eliminarMedia`.
- Componentes: `media-card`, `media-acciones` (client), `subir-media` (client), `media-pedido` (server).

## Eventos que emite / consume
- Consume: Producción (foto por etapa: la orden sube con `orden_id` + `etapa`, tipo `foto_etapa`),
  Santiago (renders Higgsfield), Documentos.
- Emite: **render aprobado → orden a `aprobacion_cliente`** (solo hacia adelante). Implementado en
  `alternarAprobado` → `avanzarOrdenAAprobacion` (matriz §4). En prod registra `orden_movimiento`.
- Alimenta a: CRM (**envío del archivo por WhatsApp asistido** desde la galería del pedido — botón "Enviar"
  con `mensajeCompartirMedia`, incluye la liga firmada si es http), Producción (referencia visual), Marketing (galería).

## Lógica no obvia / trampas
- **Bucket PRIVADO + URL firmada**: nunca exponer una URL pública de una foto de cliente. La `url` de cada
  `Media` la pone la capa de datos (firmada en prod, placeholder SVG data-URI en muestra).
- **Modo muestra**: sin Storage local; `subirMedia` guarda el archivo como data-URI para verlo en la galería.
  `MEDIA_MUESTRA` usa placeholders SVG. Nada de esto corre en prod (`supabaseConfigurado()`).
- Límite 15 MB/archivo. `subirMedia` hace rollback del objeto en Storage si el insert de la fila falla.
- No se probó subida real desde el sandbox (sin Storage, como el riel de WhatsApp): se verifica en prod.

## Pendientes conocidos de este módulo
- Correr `supabase/storage/media_setup.sql` en prod (crea el bucket + policies) además de aplicar `0021`.
- El envío por WhatsApp incluye la liga firmada de 1 h en el texto; si la persona tarda >1 h, regenerar
  (recargar la galería vuelve a firmar). Adjuntar el archivo binario en el mensaje llega con el riel oficial.
- Galería general por cliente/ficha 360 (hoy la galería general es global + por pedido/orden).
