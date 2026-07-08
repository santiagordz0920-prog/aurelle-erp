# Módulo: Documentos (Fase 4)

> Contrato y nota de remisión generados desde el pedido, con identidad Aurelle
> (§3.12). v1: generación imprimible/PDF. E-firma y archivado: siguiente slice.

## Estado
Construido en Fase 4. Última modificación: 2026-07-08. Contrato/recibo imprimibles (sin
migración) + **archivado y e-firma** (migración 0020, aplicada en prod).
v2 (2026-07-08): contrato automático al confirmar, archivo en la ficha 360, firma en canvas.
**OJO: v2 con build+lint verdes pero sin smoke test visual** (sandbox inestable; ver ESTADO §Problemas).

## Rutas / pantallas (fuera del cascarón, imprimibles / PDF)
- `/imprimir/contrato/[id]` (id = pedidoId) — contrato de compraventa: cliente, línea, precio, plan de pagos, saldo, términos (anticipos/garantía/especificaciones), y campo **Firma del cliente** en blanco.
- `/imprimir/recibo/[id]?p=[pagoId]` — nota de remisión / recibo de un pago (concepto, método, monto, acumulado y saldo). Sin `?p=` toma el último pago.
- Enlaces desde el pedido `/ventas/pedidos/[id]`: "Contrato" en el encabezado; "Recibo" por cada pago; tarjeta **Documentos** (generar contrato para firma, copiar liga, cancelar, ver firmado).
- `/firmar/[token]` — **PÚBLICA** (sin cuenta): el cliente ve el contrato y firma (nombre + aceptación + evidencia). El token es la llave; se lee/escribe con service_role. Comparte la liga por WhatsApp asistido desde la ficha.

## Tablas (migración 0020)
- `documento` — pedido_id, tipo (contrato/nota_remision/adenda), **token único** (llave de la liga), estado (borrador/enviado/firmado/cancelado), version, firmado_por, firmado_at, evidencia (jsonb: user_agent, ip, at). RLS por sucursal para el equipo; la firma pública NO usa esas policies.

## Capa de datos / acciones
- `src/lib/documentos.ts`: tipos + etiquetas.
- `src/lib/data/documentos.ts`: `listarDocumentosDePedido` (equipo), **`listarDocumentosDeCliente`** (ficha 360, join `pedido!inner` por `cliente_id`), `getDocumentoParaFirma` (público, **admin client** por token + datos del contrato).
- `documentos-actions.ts` (equipo): `generarContrato` (token aleatorio, estado enviado), **`crearContratoSiNoExiste`** (idempotente, para el disparo automático), `cancelarDocumento`.
- `firmar/[token]/actions.ts` (público): `firmarDocumento` (valida token, registra nombre+fecha+evidencia **+ `firma_trazo`**, estado firmado; bloquea re-firma; service_role).
- Componentes v2: `documentos-cliente` (lista archivada, muestra el trazo si existe), `canvas-firma` (captura del trazo en `<FirmaForm>`).
- `<ContratoDoc>` compartido por `/imprimir/contrato` y `/firmar/[token]`.

## Eventos / matriz §4
- **Pedido confirmado → genera contrato:** `cambiarEstado(..., 'confirmado')` llama `crearContratoSiNoExiste` (idempotente, no pisa uno firmado). El botón manual "Generar contrato" sigue existiendo. Pendiente: aviso "contrato sin firmar 48h" (cron).

## Lógica no obvia / trampas
- **Ruta `/firmar` es pública** (agregada a `esPublica` en el middleware). Sin sesión; el **token** (64 hex) es la capacidad. Se lee/escribe con `createAdminClient()` (service_role) → requiere `SUPABASE_SERVICE_ROLE_KEY` en Vercel (ya lo usa el cron de gastos).
- Firma simple con evidencia (nombre + aceptación + timestamp + user-agent/ip). El **trazo en canvas** es una mejora posterior.
- No se puede re-firmar (bloqueado por estado) ni firmar un documento cancelado.

## Pendientes conocidos
- **Smoke test visual de v2** (tab Documentos/Media en la ficha, contrato auto al confirmar, canvas en /firmar). Ver ESTADO §Siguiente tarea.
- Aviso "contrato sin firmar 48h" (cron/notificación).
- Snapshot del contrato firmado (hoy `/imprimir/contrato/[id]` lo reimprime en vivo desde el pedido; si el pedido cambia, cambia el impreso).
- **Plantillas editables por Santiago** (texto legal/garantía) sin tocar código.
- PDF binario con tipografías de marca server-side (hoy imprime la web; el navegador guarda como PDF).
