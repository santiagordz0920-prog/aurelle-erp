# Módulo: Documentos (Fase 4)

> Contrato y nota de remisión generados desde el pedido, con identidad Aurelle
> (§3.12). v1: generación imprimible/PDF. E-firma y archivado: siguiente slice.

## Estado
Construido en Fase 4. Última modificación: 2026-07-06. Contrato/recibo imprimibles (sin
migración) + **archivado y e-firma** (migración 0020).

## Rutas / pantallas (fuera del cascarón, imprimibles / PDF)
- `/imprimir/contrato/[id]` (id = pedidoId) — contrato de compraventa: cliente, línea, precio, plan de pagos, saldo, términos (anticipos/garantía/especificaciones), y campo **Firma del cliente** en blanco.
- `/imprimir/recibo/[id]?p=[pagoId]` — nota de remisión / recibo de un pago (concepto, método, monto, acumulado y saldo). Sin `?p=` toma el último pago.
- Enlaces desde el pedido `/ventas/pedidos/[id]`: "Contrato" en el encabezado; "Recibo" por cada pago; tarjeta **Documentos** (generar contrato para firma, copiar liga, cancelar, ver firmado).
- `/firmar/[token]` — **PÚBLICA** (sin cuenta): el cliente ve el contrato y firma (nombre + aceptación + evidencia). El token es la llave; se lee/escribe con service_role. Comparte la liga por WhatsApp asistido desde la ficha.

## Tablas (migración 0020)
- `documento` — pedido_id, tipo (contrato/nota_remision/adenda), **token único** (llave de la liga), estado (borrador/enviado/firmado/cancelado), version, firmado_por, firmado_at, evidencia (jsonb: user_agent, ip, at). RLS por sucursal para el equipo; la firma pública NO usa esas policies.

## Capa de datos / acciones
- `src/lib/documentos.ts`: tipos + etiquetas.
- `src/lib/data/documentos.ts`: `listarDocumentosDePedido` (equipo), `getDocumentoParaFirma` (público, **admin client** por token + datos del contrato).
- `documentos-actions.ts` (equipo): `generarContrato` (token aleatorio, estado enviado), `cancelarDocumento`.
- `firmar/[token]/actions.ts` (público): `firmarDocumento` (valida token, registra nombre+fecha+evidencia, estado firmado; bloquea re-firma; service_role).
- `<ContratoDoc>` compartido por `/imprimir/contrato` y `/firmar/[token]`.

## Eventos / matriz §4
- "Cotización aceptada → Documentos genera contrato": hoy es **on-demand** (botón "Generar contrato para firma"). El disparo automático al confirmar y el aviso "contrato sin firmar 48h" (cron) son mejoras siguientes; el archivado ya existe (tabla `documento`).

## Lógica no obvia / trampas
- **Ruta `/firmar` es pública** (agregada a `esPublica` en el middleware). Sin sesión; el **token** (64 hex) es la capacidad. Se lee/escribe con `createAdminClient()` (service_role) → requiere `SUPABASE_SERVICE_ROLE_KEY` en Vercel (ya lo usa el cron de gastos).
- Firma simple con evidencia (nombre + aceptación + timestamp + user-agent/ip). El **trazo en canvas** es una mejora posterior.
- No se puede re-firmar (bloqueado por estado) ni firmar un documento cancelado.

## Pendientes conocidos
- Disparo automático del contrato al confirmar el pedido + aviso "sin firmar 48h" (cron/notificación).
- Trazo de firma en canvas (hoy: nombre + aceptación como evidencia).
- Archivar el documento firmado en la pestaña del cliente (hoy vive en el pedido).
- **Plantillas editables por Santiago** (texto legal/garantía) sin tocar código.
- PDF binario con tipografías de marca server-side (hoy imprime la web; el navegador guarda como PDF).
