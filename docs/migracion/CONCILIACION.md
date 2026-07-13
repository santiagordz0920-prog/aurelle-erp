# CONCILIACIÓN — Hoja de trabajo para contestar FALTANTES.md

> Las mismas 31 preguntas de `FALTANTES.md`, reorganizadas para la sesión de socios:
> primero las reglas que desbloquean filas en masa, luego el dinero vivo, luego el detalle.
> **Cómo contestar:** escribe la respuesta en la línea `R:` de cada pregunta (o contéstalas
> por chat en orden y Claude las vacía aquí). El detalle completo de cada pregunta
> (filas exactas, montos, contexto) está en `FALTANTES.md` con el mismo código F-xx.

**Estado: 0/31 contestadas.**

---

## Bloque A — Reglas del import (8 preguntas, ~15 min)
Son decisiones de criterio, no de dato. Cada una desbloquea filas en masa; sin ellas el import no puede ni empezar.

- [ ] **F-05 · ¿Qué es Ventas vs Producción?** ¿Confirman que Producción (73) es TODO el pipeline y Ventas (49) solo lo cerrado/cobrado? Esa regla evita duplicar pedidos.
  R:
- [ ] **F-09 · ¿Qué pagos valen?** Propuesta: los 171 ingresos con fecha de Contabilidad son los pagos reales; el acumulado de Producción solo valida totales. ¿De acuerdo? *(Desbloquea las 242 filas de pagos, junto con F-12.)*
  R:
- [ ] **F-23 · Deuda / Pago Deuda / Capital.** El ERP hoy solo tiene ingreso/gasto. ¿Deuda (217 filas, $4.29M) = préstamo por pagar? ¿Pago Deuda (48, $445k) = abono? ¿Capital (4, $72k) = aportación de socios? ¿Costo (77) = gasto de costo de venta? *(Desbloquea 269 movimientos; implica extender el esquema de Finanzas.)*
  R:
- [ ] **F-21 · Papá Fer, Fer y Santi** son financiamiento/capital (~$3.7M vivo), NO proveedores. ¿Confirmado?
  R:
- [ ] **F-19 · Consignación.** Los anillos de La Jefa (A1–A27) y Tío Fer (Ar01–Ar126) entran como inventario EN CONSIGNACIÓN (no capital propio). ¿Confirmado?
  R:
- [ ] **F-18 · Estados de piezas.** INV→disponible, VEN→vendido, MON/FAB→reservado: ¿correcto? ¿Y qué significan exactamente **CAM** y **MON EXPO**?
  R:
- [ ] **F-24 · 44 fechas en texto** ("15-Feb-25", "4-June-26"). ¿Las normalizo a fecha con esa lectura de año, o alguna es ambigua?
  R:
- [ ] **F-26 · Citas.** Ninguna sheet tiene citas. ¿El módulo Citas arranca desde cero (no hay agenda/calendario que migrar)?
  R:

## Bloque B — Dinero vivo y contradicciones (9 preguntas, con las sheets enfrente)
Aquí está la plata: **~$464,100 de saldos pendientes** según Producción, más costos por aclarar.

- [ ] **F-10 · Cobranza real de ~20 pedidos con saldo** (tabla completa en FALTANTES; suma ~$464k). Por cada uno: ¿ya se pagó algo más, cuánto y cuándo? Es LA pregunta grande de la sesión.
  R:
- [ ] **F-13 · Anillo A9 contradictorio:** Inventario lo marca vendido y entregado; Producción R45 dice "falta liquidar, saldo $18,500". ¿Cuál gana?
  R:
- [ ] **F-11 · Fórmula rota (Luis Saucedo R62–R63):** el Restante apunta a la columna equivocada. ¿Los saldos correctos son $13,250 y $7,750?
  R:
- [ ] **F-02 · 5 pedidos sin cliente/teléfono completo** (R45, R50, R74, R75, R76 — detalle en FALTANTES). ¿Nombre y teléfono reales?
  R:
- [ ] **F-01 · 7 clientes solo con nombre de pila en Ventas** (Victor, Eber, Javier, Merlo, Manolo, Catherine, Ezequiel). ¿Quién es cada uno y son distintos de los de Producción?
  R:
- [ ] **F-12 · Ligar los 171 ingresos a su cliente/pedido** (el nombre va en el texto: "Anticipo Victor"). *Claude puede pre-machear por nombre y traer solo las excepciones a validar — pídanlo antes de la sesión.*
  R:
- [ ] **F-06 · Ligar cada venta de Ventas con su pedido de Producción** (para el costo real). *Igual: Claude puede proponer matches por nombre+monto+fecha y ustedes solo validan.*
  R:
- [ ] **F-08 · Heber Acosta, 2 argollas con monto $0.** ¿Cortesía, no cobrado aún, o falta capturar?
  R:
- [ ] **F-07 · 12 celdas de costo en rojo en Ventas** ("dato a revisar"). ¿Cuál es el costo correcto de cada una? (Se puede contestar después del import con un ajuste; no bloquea.)
  R:

## Bloque C — Inventario y proveedores (7 preguntas)

- [ ] **F-14 · Subsets de inventario:** ¿el maestro (Operaciones/Inventario Gemas, 103 con ID y costo) es la única verdad y descarto Inventario/Gemas (44) y Diamantes (35), o hay piezas que SOLO estén en esos dos?
  R:
- [ ] **F-15 · Piezas en DUDA1** (series 1020 y 1041). ¿Estado real?
  R:
- [ ] **F-16 · 2 piezas sin número de serie** (Emerald 1.68 y 2.05 D VVS1). ¿Qué ID les toca?
  R:
- [ ] **F-17 · Anillos A101–A106:** ¿piezas físicas propias o piedras del maestro ya montadas (duplicado)?
  R:
- [ ] **F-20 · Consignantes:** ¿"La Jefa" es María de Lourdes Pérez Lozano? ¿Nombre real y contacto de "Tío Fer"?
  R:
- [ ] **F-22 · Proveedores:** ¿Agustín, Chino y Forte son todos, o faltan (labs, wholesaler, aduanas)? ¿Contactos?
  R:
- [ ] **F-25 · Control de caja:** la sheet dice Efectivo/Bancos = $0 y Deudas $3.7M. ¿El saldo de caja real hoy es cero, o la pestaña está desactualizada?
  R:

## Bloque D — No bloquean el import (7 preguntas; pueden contestarse después)

- [ ] **F-03 · Fuente de cada cliente** (ads/expo/referido). No existe en las sheets; puede quedar vacío e irse llenando.
  R:
- [ ] **F-04 · Correo/Instagram/fecha de boda** de clientes. Igual: vacío es aceptable.
  R:
- [ ] **F-27 · Datos de las 25 expos prospecto** (costo stand, contacto, asistentes). ¿Existen en otro lado o se investigan después?
  R:
- [ ] **F-28 · Expos ya realizadas** (Expo Tu Boda 2025 etc., viven como gastos en Contabilidad). ¿Crear registros históricos de expo con ROI, o solo futuras?
  R:
- [ ] **F-29 · Inventario/Churumbelas:** ¿catálogo de modelos (→ Base de conocimiento) o inventario físico?
  R:
- [ ] **F-30 · Operaciones/Catálogo** (modelos de China): ¿lo migro al futuro módulo Catálogo/Base de conocimiento?
  R:
- [ ] **F-31 · Inventario/Sheet9 está vacía.** ¿Confirman que se ignora?
  R:

---

## Qué desbloquea cada bloque
| Bloque | Al contestarlo se puede… |
|---|---|
| A | generar el SQL de la estructura del import y migrar movimientos (902) y pedidos (73) en dry-run |
| B | migrar pagos (242) completos y dejar la cobranza viva correcta en el ERP |
| C | migrar items (261) y proveedores (6) sin duplicados |
| D | nada del import depende de esto — es enriquecimiento posterior |

**Atajo recomendado:** antes de la sesión larga del Bloque B, pidan a Claude el pre-macheo de F-12 y F-06 (propuestas automáticas para solo validar) — reduce la sesión a la mitad.
