# Módulo: Documentos (Fase 4)

> Contrato y nota de remisión generados desde el pedido, con identidad Aurelle
> (§3.12). v1: generación imprimible/PDF. E-firma y archivado: siguiente slice.

## Estado
Construido en Fase 4. Última modificación: 2026-07-08. Contrato/recibo imprimibles (sin
migración) + **archivado y e-firma** (migración 0020, aplicada en prod).
v2 (2026-07-08): contrato automático al confirmar, archivo en la ficha 360, firma en canvas.
v2 verificada con smoke test visual (2026-07-08).
**v3 (2026-07-08): snapshot del contrato firmado** (migración 0022) — al firmar se congela el
contenido y las vistas de un documento firmado lo leen de ahí, no del pedido en vivo. Build+lint
verdes y smoke test (firmar/imprimir del doc firmado muestran el snapshot; los no firmados siguen en vivo).
**v4 (2026-07-08): cláusulas legales editables** (migración 0024) — el texto legal del contrato
(anticipos, garantía, especificaciones…) se edita en `/sistema/contrato` (solo admin); las cláusulas
vigentes se congelan en el snapshot al firmar. Build+lint verdes + smoke test.

## Rutas admin
- `/sistema/contrato` — **admin only**: edita las cláusulas legales del contrato (agregar, editar, reordenar, activar/desactivar, eliminar). Enlace desde `/sistema`.

## Rutas / pantallas (fuera del cascarón, imprimibles / PDF)
- `/imprimir/contrato/[id]` (id = pedidoId) — contrato de compraventa: cliente, línea, precio, plan de pagos, saldo, términos (anticipos/garantía/especificaciones), y campo **Firma del cliente** en blanco.
- `/imprimir/recibo/[id]?p=[pagoId]` — nota de remisión / recibo de un pago (concepto, método, monto, acumulado y saldo). Sin `?p=` toma el último pago.
- Enlaces desde el pedido `/ventas/pedidos/[id]`: "Contrato" en el encabezado; "Recibo" por cada pago; tarjeta **Documentos** (generar contrato para firma, copiar liga, cancelar, ver firmado).
- `/firmar/[token]` — **PÚBLICA** (sin cuenta): el cliente ve el contrato y firma (nombre + aceptación + evidencia). El token es la llave; se lee/escribe con service_role. Comparte la liga por WhatsApp asistido desde la ficha.

## Tablas (migración 0020 + 0022 + 0024)
- `documento` — pedido_id, tipo (contrato/nota_remision/adenda), **token único** (llave de la liga), estado (borrador/enviado/firmado/cancelado), version, firmado_por, firmado_at, evidencia (jsonb: user_agent, ip, at, firma_trazo), **contenido (jsonb, 0022): snapshot inmutable del contrato al firmar (ContratoDatos, incluye cláusulas)**. RLS por sucursal para el equipo; la firma pública NO usa esas policies.
- `clausula_contrato` (0024) — cláusulas legales del contrato: `titulo`, `cuerpo`, `posicion`, `activo`. RLS: lectura del equipo por sucursal; **escritura SOLO admin**. Semilla = las cláusulas que estaban en `<ContratoDoc>`.

## Capa de datos / acciones
- `src/lib/documentos.ts`: tipos + etiquetas.
- `src/lib/data/documentos.ts`: `listarDocumentosDePedido` (equipo), **`listarDocumentosDeCliente`** (ficha 360, join `pedido!inner` por `cliente_id`), `getDocumentoParaFirma` (público, **admin client** por token + datos del contrato).
- `documentos-actions.ts` (equipo): `generarContrato` (token aleatorio, estado enviado), **`crearContratoSiNoExiste`** (idempotente, para el disparo automático), `cancelarDocumento`.
- `firmar/[token]/actions.ts` (público): `firmarDocumento` (valida token, registra nombre+fecha+evidencia **+ `firma_trazo`** **+ congela `contenido` (snapshot, 0022)**, estado firmado; bloquea re-firma; service_role).
- `construirContratoDesdePedido(adminClient, pedidoId)` (en `data/documentos.ts`): arma `ContratoDatos` desde el pedido (incluye cláusulas activas). Fuente del contrato en vivo (antes de firmar) y del snapshot que se congela al firmar.
- **Cláusulas (0024):** `listarClausulasContrato` (admin, todas) y `clausulasContratoActivas(supabase?)` (activas, para render/congelado; acepta admin client en la firma pública). `CLAUSULAS_CONTRATO_DEFAULT` en `lib/documentos.ts` = semilla + fallback.
- `sistema/contrato-actions.ts` (**admin only**): `agregarClausula`, `editarClausula`, `alternarClausula`, `moverClausula`, `eliminarClausula`.
- Componentes: `documentos-cliente` (lista archivada, muestra el trazo si existe), `canvas-firma` (captura del trazo en `<FirmaForm>`), **`clausulas-editor`** (editor admin de cláusulas).
- `<ContratoDoc>` compartido por `/imprimir/contrato` y `/firmar/[token]`; renderiza `datos.clausulas` (o el default si el snapshot no las trae).

## Eventos / matriz §4
- **Pedido confirmado → genera contrato:** `cambiarEstado(..., 'confirmado')` llama `crearContratoSiNoExiste` (idempotente, no pisa uno firmado). El botón manual "Generar contrato" sigue existiendo. Pendiente: aviso "contrato sin firmar 48h" (cron).
- **Firma → congela el contrato:** al firmar se guarda `documento.contenido` (snapshot). `/imprimir/contrato/[id]` (equipo) y `/firmar/[token]` (cliente) leen ese snapshot cuando el documento está firmado; si no, arman el contrato en vivo desde el pedido.

## Lógica no obvia / trampas
- **Ruta `/firmar` es pública** (agregada a `esPublica` en el middleware). Sin sesión; el **token** (64 hex) es la capacidad. Se lee/escribe con `createAdminClient()` (service_role) → requiere `SUPABASE_SERVICE_ROLE_KEY` en Vercel (ya lo usa el cron de gastos).
- Firma simple con evidencia (nombre + aceptación + timestamp + user-agent/ip). El **trazo en canvas** es una mejora posterior.
- No se puede re-firmar (bloqueado por estado) ni firmar un documento cancelado.

## Aviso "contrato sin firmar 48h" (cron, 0025)
- El cron nocturno `/api/cron/seguimiento` crea una tarea de seguimiento por cada contrato en estado `enviado` con >48 h sin firma. Idempotente (no duplica si ya hay tarea pendiente "Contrato sin firmar: …" para ese pedido). Ver `docs/modulos/seguimiento-cron.md`.

## Pendientes conocidos
- PDF binario server-side con tipografías de marca (hoy imprime la web → guardar como PDF desde el navegador).
- PDF binario con tipografías de marca server-side (hoy imprime la web; el navegador guarda como PDF).
