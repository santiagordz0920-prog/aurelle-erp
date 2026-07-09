# Módulo: Inventario (Fase 1)

> Reemplaza la Sheet de Inventario. Cada piedra/montura/pieza con su historia.

## Estado
Construido en Fase 1. Última modificación: 2026-07-05.

## Tablas (migración 0005; fix de auditoría en 0006)
- `item_inventario` — sku (único por sucursal), tipo (enum `tipo_item`), nombre, descripción, 4Cs (quilates/color/claridad/corte), propiedad (enum `propiedad_item`), consignante_id, ubicacion (texto), estado (enum `estado_item`), foto_url, certificado_url, pedido_id (lo usará Pedidos para reservar/consumir), sucursal_id.
- `item_costo` — **SOLO ADMIN** (RLS `es_admin()`): 1:1 con item, costo + moneda. Separado para ocultarlo por completo a ventas/taller a nivel base de datos.
- `consignante` — directorio ligero (nombre, contacto, condiciones). En Fase 2 se liga a Proveedores/CxP.

## Rutas / pantallas
- `/taller` — landing con tarjetas a Inventario (activo), Producción/Biblioteca (Fase 4).
- `/taller/inventario` — lista con búsqueda + filtros (tipo, estado), valor del inventario propio (solo admin), botón nuevo.
- `/taller/inventario/nuevo` — alta; campos 4C aparecen si tipo es diamante/piedra; consignante si propiedad=consignación; costo solo si admin.
- `/taller/inventario/[id]` — ficha con datos, certificado, costo (admin) y editor de estado/ubicación.

## Eventos que emite / consume
- Todavía no dispara eventos de la matriz. Pendiente (llega con Pedidos/Finanzas): al vender item de consignación → CxP automática al consignante (Finanzas, Fase 2). Reserva/consumo de items lo hará Pedidos (0007) usando `pedido_id` + `estado`.

## Lógica no obvia / trampas
- **Costo = solo admin, garantizado por RLS**, no por UI: vive en `item_costo`. En la capa de datos, el costo solo se adjunta si `usuario.rol === 'admin'`; en Supabase la RLS lo devuelve null a los demás aunque se pida la relación. Probado en Postgres (ventas ve items, 0 costos).
- `valorInventario()` suma costo de items `propio` no vendidos; devuelve null si no es admin.
- Consignante se busca-o-crea por nombre al dar de alta un item en consignación.
- Constantes de estado (`ESTADOS_ITEM`, `ESTADO_ITEM`) viven en `src/lib/inventario.ts` (cliente-safe), NO en la capa de datos server-only.

## Consumo desde Producción (0026)
- El ciclo del item es `disponible → reservado → consumido` (o `vendido`). La **reserva** ocurre desde el Pedido (`reservarItem`); el **consumo** ocurre desde la orden de Producción (tarjeta "Materiales del pedido", `consumirMaterial`). Al consumir, el item pasa a `consumido` y su `item_costo` **suma al `costo_real` del pedido** vía el trigger de 0026 (`recomputar_por_item_inventario` → `recomputar_costo_real`). Ver `docs/modulos/produccion.md`.
- Nota: **cualquier** cambio de fila en `item_inventario` dispara el recompute del `costo_real` de su `pedido_id` (idempotente y barato; si `pedido_id` es null, no hace nada).

## Alerta de stock bajo (0028, Fase 5)
- Tabla `umbral_stock` (tipo, minimo, sucursal_id; PK tipo+sucursal): el admin fija el **mínimo de disponibles** por categoría (`tipo`) en `/taller/inventario/umbrales` (`guardarUmbral`, upsert solo-admin; RLS: lectura por sucursal, escritura admin). `listarUmbrales()` devuelve por tipo el `minimo` + los `disponibles` actuales (contexto para fijar números).
- El **cron nocturno** (`generar_tareas_seguimiento`, ampliado en 0028) cuenta los `item_inventario` en estado `disponible` de cada tipo con `minimo>0`; si `disponibles < minimo` → tarea sugerida "Stock bajo: <categoría>" (sin entidad, idempotente por título). Enlace admin "Umbrales de stock" en la cabecera de `/taller/inventario`. Ver `docs/modulos/seguimiento-cron.md`.
- v1 por `tipo` (dimensión estructurada). Categorías más finas ("solitario oro blanco", que viven en nombre/descripcion) y la sugerencia de recompra ligada al proveedor con su último precio quedan como mejora.

## Pendientes conocidos de este módulo
- Subida real de fotos/certificados a Supabase Storage (hoy es URL) — llega con Biblioteca (Fase 4).
- Vista "qué hay en cada vitrina" agrupada por ubicación (hoy lista + filtros).
- Stock bajo por categoría FINA (no solo `tipo`) + sugerencia de recompra con proveedor y último precio (§3.6).
- Movimientos con historial dedicado (hoy: cambios de estado/ubicación quedan en auditoría).
- Edición completa del item (hoy: alta + estado/ubicación).
