# Módulo: Documentos (Fase 4)

> Contrato y nota de remisión generados desde el pedido, con identidad Aurelle
> (§3.12). v1: generación imprimible/PDF. E-firma y archivado: siguiente slice.

## Estado
Construido en Fase 4. Última modificación: 2026-07-06. **Sin migración** (se generan
al vuelo desde los datos del pedido, como la cotización imprimible).

## Rutas / pantallas (fuera del cascarón, imprimibles / PDF)
- `/imprimir/contrato/[id]` (id = pedidoId) — contrato de compraventa: cliente, línea, precio, plan de pagos, saldo, términos (anticipos/garantía/especificaciones), y campo **Firma del cliente** en blanco.
- `/imprimir/recibo/[id]?p=[pagoId]` — nota de remisión / recibo de un pago (concepto, método, monto, acumulado y saldo). Sin `?p=` toma el último pago.
- Enlaces desde el pedido `/ventas/pedidos/[id]`: "Contrato" en el encabezado; "Recibo" por cada pago.

## Capa
- Sin capa de datos nueva: reusa `getPedido` (cliente, línea, total, pagos, saldo) y `PrintButton`.
- Estilo de marca igual a `/imprimir/cotizacion` y `/imprimir/reporte-socio`.

## Eventos / matriz §4
- Reacción "cotización aceptada → Documentos genera contrato": hoy el contrato se genera **on-demand** desde el pedido (botón). El disparo automático al confirmar + el aviso "contrato sin firmar 48h" quedan para cuando exista el archivado (tabla `documento`) y el riel de WhatsApp.

## Pendientes conocidos
- **Tabla `documento`** para archivar (versionado + adenda + "archivado en la ficha del cliente").
- **E-firma vía link** (trazo + timestamp + teléfono como evidencia) — se puede construir dentro del ERP; el envío del link por WhatsApp depende del riel (Fase 3 vivo).
- **Plantillas editables por Santiago** (texto legal / garantía) sin tocar código.
- Nota de remisión a la entrega (hoy es por pago).
- PDF binario con tipografías de marca server-side (hoy imprime la página web; el navegador guarda como PDF).
