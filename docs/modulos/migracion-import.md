# Módulo: Import de las sheets (Fase 3 de la migración)

> Herramienta de import histórico Google Sheets → ERP (docs/MIGRACION_DATOS.md).
> No es una pantalla: es migración 0038 + generador + SQL por lote.

## Estado
Construido 2026-07-13. Dry-run local VERDE (sumas centavo a centavo, idempotencia,
revert y dedup contra el riel probados). **Pendiente: correr en prod con OK de Santiago.**

## Piezas
- `supabase/migrations/0038_migracion_sheets.sql` — categoría `transferencia_interna`
  en el ledger (cash↔cuenta, fuera del P&L, signo 0) + `migracion_lote` /
  `migracion_registro` (solo-admin) + `revertir_lote_migracion(uuid)` (SECURITY DEFINER).
- `scripts/migracion/resoluciones.mjs` — TODAS las decisiones de la conciliación
  (CONCILIACION.md + PREMACHEO.md) como datos revisables. El generador no decide nada.
- `scripts/migracion/generar-import.mjs` — lee `docs/migracion/csv/*` y produce
  `scripts/migracion/out/import_sheets.sql` (una transacción, un DO-block por fila,
  idempotente por llave natural) + `out/reporte.md` (ligas de pagos, sin-ligar, avisos).
  `out/` está gitignoreado: el código es la fuente de verdad, el SQL se regenera.

## Cómo se corre (prod, cuando Santiago dé el OK)
1. Aplicar `0038` en el SQL editor de Supabase.
2. `node scripts/migracion/generar-import.mjs` → revisar `out/reporte.md`.
3. Pegar `out/import_sheets.sql` en el SQL editor (corre TODO o nada).
4. Correr las 3 queries de verificación del final del archivo y comparar contra
   los controles (abajo). Si no cuadra: `select * from revertir_lote_migracion('<lote>')`.

## Cifras de control (dry-run local 2026-07-13)
| categoría | filas | total |
|---|---|---|
| ingreso | 142 | $1,869,316.52 |
| transferencia_interna | 29 | $388,051.24 |
| gasto | 385 | $4,475,251.21 |
| costo | 77 | $1,698,570.71 |
| deuda | 217 | $4,289,839.92 |
| pago_deuda | 48 | $445,270.81 |
| capital | 4 | $72,378.57 |
(ingreso+transferencias = $2,257,367.76 ≈ control de la sheet; gasto+costo = $6,173,821.92 ✔)
Pedidos: 73, suma $1,825,270 exacto. Conteos: 55 clientes, 265 items, 84 pagos, 25 expos, 4 proveedores, 1 consignante, 73 cotizaciones.

## Lógica no obvia / trampas
- **`trg_pago_asiento` se DESHABILITA durante el import** (el ledger ya viene completo
  de Contabilidad; el trigger duplicaría ingresos). Se re-habilita en el mismo SQL.
- Histórico NO dispara eventos §4 (inserta directo, sin Server Actions).
- Dedup de clientes por teléfono: si el riel ya creó al cliente, se enlaza
  (`creado=false`, el revert NO lo borra) y solo se le agrega una nota; no se modifica.
- La descripción de la pieza vive en una cotización 'aceptada' creada por pedido
  (el `pedido` no tiene columna de descripción).
- Reparto por cuadre (Jonathan $84k / Juan $100k): pagos cronológicos llenan los
  pedidos del cliente hasta su precio; sobrantes quedan solo en el ledger y se
  listan en `out/reporte.md`.
- Los pagos de clientes solo-Ventas (sin pedido en Producción) quedan solo en el
  ledger — esperado, no es bug (ver reporte).
- `item_costo` (solo-admin) solo se crea si hay costo > 0; consignación apunta a
  La Jefa (F-20b) y su costo es lo que se devuelve al venderse.

## Pendientes conocidos
- Churumbelas Ch1–Ch11 (F-29): la lectura de Drive solo da la 1a pestaña; extraer
  vía Cowork o pegado manual → agregar a resoluciones y regenerar.
- Datos de Fer: F-15 (DUDA1), F-16 (series MIG-S1/S2), CAM, nombre/contacto de La
  Jefa, Jorges/Gerardo/Marcos Reyes (~$136k de ingresos sin ligar quedan a mano en el ERP).
- F-02: Santiago llenará los 5 clientes placeholder (editar en el ERP tras el import).
- Tras el import en prod: congelar las sheets (solo lectura) y borrar cliente de prueba "SRR".
