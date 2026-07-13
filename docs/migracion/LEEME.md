# LEEME — Paquete de migración Aurelle & Co.

Preparado para la sesión de Claude que conoce el esquema del ERP y hará el import. **Precisión sobre velocidad.** Nada se resolvió con supuestos: los huecos son preguntas en `FALTANTES.md`.

## Contenido
- `INVENTARIO.md` — qué hay en cada sheet/pestaña: columnas reales, filas, rangos de fecha, problemas.
- `MAPEO.md` — cada columna origen → campo destino; qué queda sin origen y sin destino.
- `FALTANTES.md` — 31 preguntas de conciliación (F-01…F-31) con referencia exacta (sheet/pestaña/fila). Las contestan los socios.
- 8 CSV (uno por entidad): `clientes` (55), `pedidos` (73), `pagos` (242), `items` (261), `proveedores` (6), `movimientos` (902), `citas` (0, sin fuente), `expos` (25).

## Convención de columnas auxiliares (en TODOS los CSV)
- `_fila_origen` — trazabilidad exacta `Libro/Pestaña/Rn`. Presente en el 100% de las filas.
- `_confianza` — `alta` (dato directo), `media` (interpretado/formato dudoso), `baja` (incompleto en origen).
- `_nota` — contexto que el import debe conocer.
- `_pregunta_pendiente` — código de FALTANTES del que depende la fila (Q-CLI, Q-PAY, Q-ITEM, Q-A9, Q-PROV, Q-FIN, Q-EXPO).

## Reglas aplicadas
- No se modificó ningún original (trabajo sobre exports del 12-jul-2026).
- No se calcularon ni "corrigieron" montos: los totales que no cuadran se reportan, no se arreglan.
- Clientes que aparecen con datos distintos en varias sheets **no se fusionaron**: se documentan en FALTANTES.
- `pagos.csv` trae dos orígenes (Producción agregado + Contabilidad con fecha) **sin sumar**, porque se traslapan.
- Inventario/Gemas e Inventario/Diamantes **no se re-migraron** (son subconjuntos del maestro Operaciones/Inventario Gemas); su cruce por certificado es tarea de import (F-14).

## Cifras de control (para validar el import)
- Movimientos: Ingreso $2,257,368 (coincide exacto con la celda de control de la propia sheet), Gasto $6,173,822, Deuda $4,289,840, Pago Deuda $445,271.
- Deuda viva reportada por la sheet "Efectivo y deudas": **$3,708,934** (Papá Fer $3,708,199, Fer $500, Santi $236).
- Suma de precios de pedidos (Producción): $1,825,270. Total de ventas por tabla dinámica (Ventas): ~$1,407,920. **No cuadran** entre sí — es esperado (73 pedidos vs 49 ventas); ver F-05.
- Rango del ledger: 15-feb-2025 → 11-jul-2026 (vigente).

## Ojos aquí (lo más frágil)
1. `pagos` requiere conciliación manual pago↔pedido↔cliente (F-09, F-10, F-12).
2. Columna `Costo` de Producción **es precio al cliente**, no costo (MAPEO).
3. Contradicción A9 vendido vs "falta liquidar" (F-13). Fórmula rota en Restante R62/R63 (F-11).
