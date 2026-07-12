# Migración de datos: Google Sheets → ERP

> Plan maestro de la migración (sesión con Fer 2026-07-12). Las 4 sheets que el
> ERP reemplaza + expos. Fer avisa: hay datos incompletos y conciliaciones
> pendientes — el diseño asume huecos desde el inicio.
> Estado: PLAN. El escaneo aún no corre.

## Fuentes (Google Drive de nubomarket@gmail.com, acceso ya conectado)
| Sheet | ID | Destino principal en el ERP |
|---|---|---|
| Operaciones v1 | `1PGyxlqlELHSwY8Z-i2bluJ29BqlyC721hos8X4hfkGQ` | clientes, pedidos, pagos, citas |
| Contabilidad v1 | `1vwobuiajCFsbxPfOQlJG7mNfUtyAXtbteQ8ANZUsOrs` | movimiento_financiero (solo-admin), gastos, CxP |
| Inventario | `1c6pV9MBO4_jAilimwkpIQaRaVgGNJbiuAnMaRGrKIGI` | item + item_costo (solo-admin), proveedor/consignante |
| Pricer v1 | `1L-bCfwqHjW8igDDUJpYattFLYPLLLh0VEKxT-sbfy_A` | reglas de precio (solo-admin) / referencia del cotizador |
| Expos Bodas Mexico 2026.xlsx | `1ekLQ2nA2UyNuJretlZDnLzOS9DcE4JIW` | expo (0034) |

## División del trabajo (3 fases, 2 actores)
1. **ESCANEO + PAQUETE (Claude con acceso a Drive — Cowork o Claude Code):**
   inventariar cada sheet (pestañas, columnas, filas, calidad), mapear al
   esquema del ERP y producir el "paquete de migración" (ver abajo). NO toca
   el ERP ni las sheets originales.
2. **CONCILIACIÓN (Fer/Santiago + Claude):** resolver el FALTANTES.md —
   pregunta por pregunta, con las sheets enfrente. Nada se rellena solo.
3. **IMPORT (Claude Code, en el repo):** genera SQL idempotente desde el
   paquete, dry-run con conteos/sumas, y SOLO con confirmación explícita de
   Santiago se corre en prod (regla dura de CLAUDE.md).

## Paquete de migración (lo que produce la fase 1)
- `INVENTARIO.md` — por sheet: pestañas, columnas reales, # filas, rangos de
  fechas, y todos los problemas encontrados (duplicados, formatos mixtos,
  celdas de colores con significado, fórmulas rotas, totales que no cuadran).
- `MAPEO.md` — columna origen → tabla.campo destino del ERP, con las
  transformaciones (enums, fechas, teléfonos) y qué se queda FUERA y por qué.
- `FALTANTES.md` — la lista de conciliación: una pregunta CONCRETA por hueco
  ("el pedido de la fila 23 no tiene anticipo registrado: ¿se pagó?"), nunca
  un supuesto. Este archivo es EL entregable para la sesión con los socios.
- CSV limpios, uno por tabla destino, ya normalizados, con columna
  `_pregunta_pendiente` en filas que dependan de conciliación.

## Principios de diseño del import (no negociables)
1. **El ERP es la verdad desde el corte; las sheets se CONGELAN** (solo
   lectura) al terminar. Nunca doble captura.
2. **Jamás inventar datos.** Hueco = pregunta en FALTANTES.md. Un default
   silencioso hoy es una mentira contable en diciembre.
3. **Identidad de cliente = teléfono** (últimos 10 dígitos, sin espacios,
   como el riel). Dedup contra los clientes que el riel YA creó en prod:
   la sheet ENRIQUECE la ficha existente, no la duplica.
4. **Dinero a tablas solo-admin** (item_costo, movimiento_financiero…), como
   todo el ERP. **Verificación por sumas:** el total de ventas/costos/gastos
   de cada sheet debe cuadrar centavo a centavo contra el ERP post-import; si
   no cuadra, el import no se da por bueno.
5. **Todo import es reversible e idempotente:** cada fila lleva
   `origen='migracion'` + `lote` (un id por corrida). Revertir un lote = un
   DELETE; re-correr no duplica (upsert por llave natural).
6. **Dry-run primero, prod después:** el SQL corre primero en el Postgres
   local del repo (cadena 0001+) con reporte de conteos y sumas esperadas vs
   insertadas. A prod solo con confirmación explícita de Santiago.
7. **Orden de FKs:** proveedores/consignantes → clientes → inventario +
   costos → pedidos → pagos → ledger → citas históricas → expos.
8. Fechas ancladas a Monterrey (UTC-6 fijo); montos `numeric` MXN.
9. Lo histórico entra como histórico: pedidos entregados NO disparan los
   eventos vivos de la matriz §4 (no queremos 50 contratos automáticos ni
   tareas de seguimiento de ventas de enero). El import escribe directo con
   service_role, sin pasar por las acciones de la app.

## Prompt para la sesión de escaneo (Cowork)
El prompt vive en el chat de la sesión 2026-07-12 con Fer y produce el paquete
de la fase 1. Si el escaneo lo hace Claude Code (también tiene Drive), este
documento es el brief y no necesita prompt aparte.
