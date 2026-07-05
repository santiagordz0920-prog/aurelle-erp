# Módulo: Pedidos (Fase 1)

> La columna vertebral (§3.4). Todo cuelga de aquí: pagos, reserva de inventario,
> costo/margen real solo-admin, candado de anticipo 2, semáforo de compromiso.

## Estado
Construido en Fase 1. Última modificación: 2026-07-05. Migración 0008 + dominio
`src/lib/pedidos.ts` ya existían; esta sesión agregó datos, acciones y UI completa.

## Tablas (migración 0008)
- `pedido` — cliente_id, cotizacion_id (nullable), linea_negocio (enum bridal/concierge),
  estado (enum por_confirmar→…→entregado/cancelado), total, fecha_compromiso,
  `override_candado`/`override_por`/`override_at` (candado anticipo 2), entregado_at. RLS por sucursal.
- `pago` — pedido_id, monto (>0), fecha, metodo (enum), tipo (enum anticipo_1/anticipo_2/parcialidad/liquidacion),
  notas, registrado_por. RLS: insert exige `registrado_por = auth.uid()` (anti-suplantación).
- `pedido_costo` — **SOLO ADMIN** (RLS): costo_real, margen_sellado (% al entregar). PK = pedido_id.

## Rutas / pantallas
- `/ventas/pedidos` — lista con línea, total, saldo y semáforo por pedido.
- `/ventas/pedidos/[id]` — candado, plan de pagos (+registrar pago 3 toques), piezas reservadas
  (+reservar/liberar item de inventario), costo/margen real (admin) y botón entregar.
- Conversión: en `/ventas/cotizaciones/[id]`, si estado='aceptada' aparece **Convertir a pedido**
  (`ConvertirBoton`); si ya hay `pedido_id`, muestra "Ver pedido".

## Datos derivados / capa
- `src/lib/data/pedidos.ts`: `listarPedidos`, `getPedido` (derivan `pagado`=Σpagos y `saldo`=total−pagado;
  `costo_real`/`margen_sellado` solo si admin), `itemsReservados` (items de inventario con `pedido_id`).
- Acciones `src/app/(app)/ventas/pedidos/actions.ts`: `crearPedidoDesdeCotizacion`, `registrarPago`,
  `reservarItem`/`liberarItem`, `cambiarEstado`, `cambiarLinea`, `overrideCandado` (admin),
  `setCostoReal` (admin), `entregarPedido` (sella margen).

## Eventos que emite / consume
- Consume Cotizador: "cotización aceptada → pedido". `crearPedidoDesdeCotizacion` copia cliente y total,
  arranca en línea 'bridal', y escribe `cotizacion.pedido_id`.
- Consume Inventario: `reservarItem` pasa el item a `estado='reservado'` con `pedido_id`; `liberarItem` revierte.
- **Reacciones de la matriz §4 pendientes (registradas como comentarios en actions.ts y en ESTADO.md):**
  asiento en Finanzas al pagar (Fase 2); CxP a consignante al reservar consignación (Fase 2);
  Postventa/Comisiones/lifecycle/sellado financiero al entregar (Fases 4/6). Contrato al confirmar (Fase 4).

## Lógica no obvia / trampas
- **Candado anticipo 2** (`puedeComprarMateriales`): habilitado si existe un pago tipo `anticipo_2` **o**
  `override_candado=true`. El override es solo-admin y queda auditado (override_por/at + trigger).
- **Sellado de margen**: `entregarPedido` fija `margen_sellado = round((total−costo_real)/total*100)` solo si
  hay costo capturado. Una vez sellado, la UI oculta el form de costo (el margen queda congelado).
- `cambiarEstado('entregado')` delega en `entregarPedido` para no saltarse el sellado.
- Pedido cerrado (entregado/cancelado): la UI oculta pagos/reserva/costo editables (solo lectura).
- Costo/margen real solo-admin por RLS (tabla `pedido_costo`), mismo patrón que item_costo y cotizacion_margen.

## Pendientes conocidos de este módulo
- Reacciones de la matriz §4 (arriba) — dependen de Finanzas (Fase 2), Producción/Documentos (Fase 4) y Postventa/Comisiones (Fase 6).
- Consumo de material al entrar a producción (`reservado`→`consumido`) se hará desde Producción (Fase 4).
- Nota de pago / recordatorios de parcialidad por WhatsApp (Fase 3).
- Elegir línea de negocio en el momento de convertir (hoy arranca en 'bridal' y se ajusta en el pedido).
