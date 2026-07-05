# Módulo: Cotizador (Fase 1)

> Reemplaza Pricer v1. Precios de metal + cotizaciones por líneas (precio de la
> pieza completa, nunca por quilate) + margen solo-admin + cotización de marca.

## Estado
Construido en Fase 1. Última modificación: 2026-07-05.

## Tablas (migración 0007)
- `precio_metal` — histórico de precios (metal enum, pureza, precio_gramo_mxn, tipo_cambio, fecha, fuente 'manual'|'api'). Lectura por sucursal; escritura solo admin.
- `cotizacion` — cliente_id, estado (enum: borrador/enviada/seguimiento/aceptada/vencida), total (pieza completa), valida_hasta, pdf_url, pedido_id (se llena al convertir). RLS por sucursal.
- `cotizacion_linea` — componentes (descripción, metal, quilataje, item_inventario_id opcional, especificación, precio, orden).
- `cotizacion_margen` — **SOLO ADMIN** (RLS): costo_estimado. Margen = (total − costo)/total. Probado en Postgres: ventas ve total y líneas, no el margen.

## Rutas / pantallas
- `/ventas` — landing (Cotizaciones, Pedidos).
- `/ventas/cotizaciones` — lista + tarjeta de precios de metal (admin puede capturarlos) + nueva.
- `/ventas/cotizaciones/nueva` — constructor: cliente, líneas (agregar/quitar), total automático, simulador de margen en vivo (solo admin).
- `/ventas/cotizaciones/[id]` — detalle con líneas, estado editable, margen (admin), link a imprimir.
- `/imprimir/cotizacion/[id]` — **fuera del cascarón**: cotización de marca imprimible/guardable como PDF, cara al cliente (sin costos ni margen).

## Eventos que emite / consume
- Consume Inventario (piedras + costo) — hoy la línea permite `item_inventario_id` pero la UI aún no enlaza inventario (captura libre). Pendiente.
- Emite → Pedidos: "cotización aceptada → crear pedido". La conversión se implementa en el módulo Pedidos (usa `cotizacion.pedido_id`).

## Lógica no obvia / trampas
- **Margen solo-admin por RLS** (tabla `cotizacion_margen`), igual patrón que item_costo.
- El total se calcula sumando las líneas en el cliente y se recalcula/valida en el server action (no se confía en el cliente).
- Precio de metal: captura **manual** con histórico. El feed automático (MetalpriceAPI/GoldAPI, §7.4) se enchufa cambiando `fuente='api'` desde un cron, sin tocar la UI.
- La cotización imprimible usa Inter (web). El PDF binario con tipografías de marca (server-side, licencia desktop) es un refinamiento posterior.

## Pendientes conocidos de este módulo
- Enlazar líneas a items reales de Inventario (piedra central desde stock, con su costo alimentando el margen).
- Reglas de margen por categoría configurables (§3.3) — hoy el costo se captura por cotización.
- Feed automático de precios de metal (API) + expiración automática de cotizaciones vía cron.
- PDF binario con tipografías de marca + envío por WhatsApp (Fase 3).
- ~~Convertir cotización → pedido~~ HECHO (2026-07-05): botón en `/ventas/cotizaciones/[id]` cuando estado='aceptada'; lógica en el módulo Pedidos.
