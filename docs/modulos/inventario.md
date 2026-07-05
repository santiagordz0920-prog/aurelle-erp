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

## Pendientes conocidos de este módulo
- Subida real de fotos/certificados a Supabase Storage (hoy es URL) — llega con Biblioteca (Fase 4).
- Vista "qué hay en cada vitrina" agrupada por ubicación (hoy lista + filtros).
- Alertas de stock bajo por categoría y sugerencia de recompra (§3.6) — requieren config + Proveedores (Fase 2).
- Movimientos con historial dedicado (hoy: cambios de estado/ubicación quedan en auditoría).
- Edición completa del item (hoy: alta + estado/ubicación).
