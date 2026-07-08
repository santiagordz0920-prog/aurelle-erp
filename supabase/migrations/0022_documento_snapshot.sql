-- ═══════════════════════════════════════════════════════════════════════════
-- 0022_documento_snapshot — Fase 4
-- Congela el contenido del contrato al momento de FIRMARSE.
--
-- Antes, /imprimir/contrato/[id] y /firmar/[token] reimprimían el contrato en
-- vivo desde el pedido. Si el pedido cambiaba después de firmado (nuevo pago,
-- cambio de precio, fecha compromiso), el "contrato ya firmado" cambiaba con él
-- — un problema legal: el cliente firmó unos términos y el documento mostraba
-- otros. Ahora, al firmar se guarda un snapshot inmutable del contrato en
-- `documento.contenido` (los datos ContratoDatos: cliente, línea, total, plan de
-- pagos, saldo, fechas). Un documento firmado se renderiza SIEMPRE desde ese
-- snapshot, nunca del pedido en vivo.
--
-- Sin backfill: los contratos ya firmados antes de esta migración (si los hay)
-- quedan con contenido NULL y siguen reimprimiéndose en vivo — el
-- comportamiento previo, aceptable para el histórico. Los nuevos se congelan.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.documento add column contenido jsonb;

comment on column public.documento.contenido is
  'Snapshot inmutable del contrato al momento de firmar (ContratoDatos: cliente, línea, total, pagos, saldo, fechas). NULL mientras no se firma; una vez firmado, se lee de aquí y no del pedido en vivo.';
