# CONCILIACIÓN — Hoja de trabajo para contestar FALTANTES.md

> Las mismas 31 preguntas de `FALTANTES.md`, reorganizadas por bloques según qué
> desbloquean. Contestadas por **Santiago en sesión interactiva del 2026-07-13**
> (Claude preguntó una por una y vació las respuestas aquí). El detalle completo
> de cada pregunta (filas exactas, montos) sigue en `FALTANTES.md` con el mismo código.

**Estado: 29/31 contestadas.** Pendientes de Fer: F-15 y F-16 (+3 datos chicos: significado de CAM, nombre/contacto de La Jefa, IDs de F-02 que Santiago llenará pronto).

---

## Bloque A — Reglas del import ✅ COMPLETO

- [x] **F-05 · ¿Qué es Ventas vs Producción?**
  R: **Ventas NO está completo y no hay info para completarlo.** Regla de import: Producción es la base de pedidos; Ventas aporta lo que tenga, sin esperar cuadre 1:1 entre ambas.
- [x] **F-09 · ¿Qué pagos valen?**
  R: **Contabilidad es el source of truth** de pagos, aunque es poco trazable a personas. Producción puede estar outdated e incompleta → se usa como referencia suave, NO como validación dura de totales.
- [x] **F-23 · Deuda / Pago Deuda / Capital.**
  R: **Como se propuso:** Deuda = préstamo por pagar (pasivo), Pago Deuda = abono al pasivo, Capital = aportación de socios, Costo = gasto de costo de venta. Implica extender el esquema de Finanzas con estos tipos.
- [x] **F-21 · Papá Fer, Fer y Santi.**
  R: **Papá Fer es financiamiento, no provee material.** Salen del catálogo de proveedores; sus movimientos van a deuda/capital según F-23.
- [x] **F-19 · Consignación.**
  R: **Confirmado:** entran como inventario en consignación (no capital propio; al venderse → CxP al consignante).
- [x] **F-18 · Estados de piezas.**
  R: Mapeo OK (INV→disponible, VEN→vendido, MON/FAB→reservado), pero **MON EXPO = DISPONIBLE** (montada en expo pero vendible en piso), no reservada. *Pendiente chico: qué significa CAM (preguntar a Fer).*
- [x] **F-24 · 44 fechas en texto.**
  R: **Normalizarlas tal cual se leen** ("15-Feb-25" → 2025-02-15).
- [x] **F-26 · Citas.**
  R: **Desde cero.** No hay agenda que migrar.

## Bloque B — Dinero vivo y contradicciones ✅ COMPLETO

- [x] **F-10 · Cobranza real de ~20 pedidos con saldo (~$464k).**
  R: **Pre-macheo:** Claude cruza cada pedido con saldo contra los ingresos de Contabilidad y presenta la lista; Santiago/Fer solo corrigen excepciones. *(Tarea de Claude antes del import.)*
- [x] **F-13 · Anillo A9 contradictorio.**
  R: **NO se ha liquidado: está "apartado" y se deben $18,500.** Gana Producción; el verde de Inventario estaba adelantado. El pedido entra como apartado con saldo vivo.
- [x] **F-11 · Fórmula rota (Luis Saucedo R62–R63).**
  R: **Sí: saldos $13,250 y $7,750** (precio − $500 de anticipo por pieza).
- [x] **F-02 · 5 pedidos sin cliente/teléfono completo.**
  R: **Dejarlos pendientes; Santiago llena la info pronto (son recientes).** Confirmado: Mauricio Rada Chau (R76) = el "Mau Rada" de los ingresos del 11-jul.
- [x] **F-01 · 7 clientes solo con nombre de pila en Ventas.**
  R: **Son clientes viejos (los primeros).** Victor: tel **8111921770**. De los demás (Eber, Javier, Merlo, Manolo, Catherine, Ezequiel) no hay datos → entran con confianza baja y sin teléfono.
- [x] **F-12 · Ligar los 171 ingresos a cliente/pedido.**
  R: **No todos los ingresos traen nombre** (Santiago no sabe cómo proceder ahí). Plan acordado: Claude pre-machea los que sí traen nombre; los demás entran como ingresos sin ligar y se ligan después a mano en el ERP.
- [x] **F-06 · Ligar Ventas ↔ Producción para el costo real.**
  R: **No se pueden ligar los costos.** Los pedidos históricos entran sin costo real; Ventas queda como referencia de contexto.
- [x] **F-08 · Heber Acosta, 2 argollas con monto $0.**
  R: **Se reembolsó el anticipo y el pedido no se hizo** → se importa como pedido cancelado, no como venta en $0.
- [x] **F-07 · 12 celdas de costo en rojo en Ventas.**
  R: **No se corrigen — esa data no existe.** Quedan tal cual con confianza media, sin tarea futura.

## Bloque C — Inventario y proveedores (5/7; F-15 y F-16 → Fer)

- [x] **F-14 · Subsets de inventario (Gemas 44 / Diamantes 35 vs maestro 103).**
  R: **Cruzar por certificado primero:** Claude verifica si hay piezas en los subsets que no estén en el maestro y reporta antes de descartar. *(Tarea de Claude antes del import.)*
- [ ] **F-15 · Piezas en DUDA1 (series 1020 y 1041).**
  R: **Preguntar a Fer.** Entran sin estado hasta resolverse.
- [ ] **F-16 · 2 piezas sin número de serie (Emerald 1.68 y 2.05 D VVS1).**
  R: **Pendiente** ("ni idea"). Propuesta en mesa: asignarles la siguiente serie libre (1114, 1115) documentado como asignado-en-migración; decidir con Fer.
- [x] **F-17 · Anillos A101/A103/A104/A106.**
  R: **RESUELTO POR CERTIFICADO** (verificado por Claude en los CSV): los 4 son piedras del maestro montadas para expo (LG669476537, LG687552383, LG689570766, LG669424552 — todas MON EXPO). **No se importan aparte;** el maestro manda y su ficha se enriquece con montaje + precio de venta. Santiago de acuerdo.
- [x] **F-20 · Consignantes.**
  R: **Corrección doble:** María de Lourdes Pérez Lozano es **CLIENTE**, no consignante. Y "Tío Fer" **no es ni cliente ni consignante**. La Jefa = mamá de Fer (nombre y contacto reales: pendiente chico con Fer).
  **F-20b (seguimiento) · Batch Ar01–Ar126:** las piezas **son de la mamá de Fer**; la columna "Precio total Tio Fer" es **lo que hay que devolver al venderse** (= costo de consignación). Consignante del batch en el ERP: La Jefa.
- [x] **F-22 · Proveedores.**
  R: **Corrección:** Agustín (maquila) y Chino (render CAD) OK; **Forte = cajas de producto (empaque)**, no diamantes; y falta el **wholesaler (surte diamantes y churumbelas)**. Catálogo final: Agustín, Chino, Forte (empaque), Wholesaler. Papá Fer sale (es financiamiento, F-21).
- [x] **F-25 · Control de caja.**
  R: **Sí, caja ≈ $0 es real.** La cifra de control vale.

## Bloque D — No bloquean el import ✅ COMPLETO

- [x] **F-03 · Fuente de cada cliente.** R: **Vacío**; el CRM la captura para nuevos.
- [x] **F-04 · Correo/Instagram/fecha de boda.** R: **Vacío**; se enriquece después.
- [x] **F-27 · Datos de las 25 expos prospecto.** R: **No existen esos datos.** Entran como prospectos y se completan al confirmar cada una.
- [x] **F-28 · Expos ya realizadas (2025).** R: **"Vacío" — no crear registros históricos de expo.** Sus gastos quedan en el ledger como gastos normales.
- [x] **F-29 · Inventario/Churumbelas.** R: **Ch1–Ch11 SÍ es inventario físico** (piezas pedibles del wholesaler) → **cambio de alcance: SE MIGRAN como items** (el paquete no las extrajo; hay que extraerlas de la sheet). **F-29b:** "MURIO" = **se dañó/perdió** → entra como baja (no disponible).
- [x] **F-30 · Operaciones/Catálogo.** R: **Para después** (módulo Base de conocimiento §3.18); no entra en este import.
- [x] **F-31 · Inventario/Sheet9.** R: **Ignorar, confirmado.**

---

## Acciones derivadas para la Fase 3 (el import las incorpora)
1. **Pre-macheos de Claude (antes de generar SQL):** F-10 (saldos vs ingresos de Contabilidad), F-12 (ingresos con nombre → cliente), F-14 (cruce por certificado de los subsets).
2. **Extraer Churumbelas Ch1–Ch11** de la sheet Inventario como items nuevos (F-29; no están en los CSV del paquete).
3. **Correcciones a los CSV del paquete:** proveedores (Forte=empaque, +Wholesaler, −Papá Fer, consignante del batch Ar = La Jefa) · items (A101/103/104/106 no van aparte; MON EXPO→disponible) · pedidos (Heber=cancelado, A9=apartado saldo $18,500, Saucedo saldos $13,250/$7,750) · clientes (Victor tel 8111921770; María de Lourdes es cliente).
4. **Esquema de Finanzas:** extender tipos de movimiento con deuda / pago_deuda / capital (F-23) — requiere migración SQL nueva.
5. **Pendientes de Fer (no bloquean arrancar la Fase 3):** F-15 (DUDA1), F-16 (series faltantes), significado de CAM, nombre/contacto de La Jefa. **De Santiago:** datos de los 5 pedidos de F-02.
