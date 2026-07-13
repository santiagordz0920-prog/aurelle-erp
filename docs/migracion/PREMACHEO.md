# PRE-MACHEO — Propuestas automáticas para validar (Fase 3, insumo)

> Generado por Claude el 2026-07-13 desde los CSV del paquete + lectura de la sheet
> Inventario (Drive). NADA de esto se importa aún: es la lista para que Santiago/Fer
> **validen o corrijan**. Complementa las respuestas de `CONCILIACION.md` (F-10, F-12, F-14).

## Hallazgo nuevo #1 — "Ingresos" que son movimientos internos (DECIDIR)
De los 171 movimientos clasificados "Ingreso" en Contabilidad, **29 son transferencias
internas** (cash↔cuenta, conversiones, rendimientos), no pagos de clientes: suman
**$388,051 (17% del total de ingresos)**. Si se importan como ingreso, inflan la venta.
**Propuesta:** importarlos como tipo aparte (`transferencia_interna`) fuera del P&L.

<details><summary>Los 29 movimientos internos detectados</summary>

| Fecha | Concepto | Monto |
|---|---|---|
| 2025-03-28 | Rendimientos | 1 |
| 2025-06-18 | Transf Cash a cuenta | 14,000 |
| 2025-06-19 | Transf Cash a cuenta | 19,500 |
| 2025-07-04 | Deuda Fer Piedras y laminadora conversión cash | 4,750 |
| 2025-07-07 | Conversión a cash  Fer y Papá Fer | 20,100 |
| 2025-07-08 | Transf Cash a cuenta | 28,900 |
| 2025-07-10 | Gasto deuda fer a cash | 200 |
| 2025-07-23 | Conversión cash a Klar 2 | 27,500 |
| 2025-08-15 | Conversion Cash a cuenta | 400 |
| 2025-08-15 | Conversion Deuda a cash | 50,000 |
| 2025-09-20 | Conversion a cash | 4,000 |
| 2025-09-22 | Transferencia Santiago Cash | 14,500 |
| 2025-10-06 | Conversion cuenta a cash | 500 |
| 2025-10-15 | Conversión Cash a Renta | 50,000 |
| 2025-12-01 | Conversion cuenta a cash | 6,000 |
| 2025-12-10 | Conversion cash a cuenta | 400 |
| 2025-12-23 | Conversión cash a cuenta | 20,000 |
| 2026-01-02 | Conversion cuenta a cash | 200 |
| 2026-01-20 | Conversion a cash deuda | 25,000 |
| 2026-01-20 | Conversion cash a cuenta | 11,900 |
| 2026-01-22 | Conversion cuenta a cash | 15,000 |
| 2026-01-26 | Conversión Cash a cuenta | 35,000 |
| 2026-01-26 | Conversion Cash a cuenta | 14,500 |
| 2026-02-14 | Conversion cash a cuenta | 600 |
| 2026-02-20 | Conversion a cash | 19,500 |
| 2026-02-23 | Conversion cash a cuenta | 1,100 |
| 2026-05-16 | Conversion cash a cuenta | 1,500 |
| 2026-06-06 | Conversion cash a cuenta | 2,000 |
| 2026-06-30 | Cash a cuenta | 1,000 |

</details>

## F-12 — Ingresos ligados a cliente (82 con match único)
Total ligado automáticamente por nombre. Validar solo los dos bloques de abajo.

<details><summary>Los 82 con match único (cliente ← concepto)</summary>

| Fecha | Concepto | Monto | → Cliente |
|---|---|---|---|
| 2025-02-28 | Anticipo Victor | 500 | Victor |
| 2025-02-28 | Anticipo Luis | 3,500 | Luis Saucedo |
| 2025-03-02 | Anticipo Eber 1 | 1,800 | Eber |
| 2025-03-08 | Anticipo Eber 2 | 4,200 | Eber |
| 2025-03-09 | Anticipo Victor 2 | 500 | Victor |
| 2025-03-23 | Victor Anticipo 2 | 1,500 | Victor |
| 2025-03-28 | Victor Anticipo 3 | 1,500 | Victor |
| 2025-03-28 | Eber 1 | 16,200 | Eber |
| 2025-03-28 | Eber 2 | 37,800 | Eber |
| 2025-04-05 | Liquidación Argolla Javier | 10,000 | Javier |
| 2025-04-08 | Luis Entrega Anillo | 31,500 | Luis Saucedo |
| 2025-04-26 | Liquidación Anillo Victor | 29,000 | Victor |
| 2025-05-18 | Anillo Merlo | 50,000 | Merlo |
| 2025-05-29 | Manolo anillo anticipo | 5,000 | Manolo |
| 2025-06-02 | Anticipo Monica | 2,500 | Mónica Ramos |
| 2025-06-12 | Merlo Anticipo 2 | 5,500 | Merlo |
| 2025-06-19 | Merlo liquidación | 7,000 | Merlo |
| 2025-06-22 | Anticipo Catherine | 959 | Catherine |
| 2025-06-22 | Anticipo David | 1,000 | David Velasco |
| 2025-06-22 | Anticipo Juan Vega | 1,000 | Juan Vega |
| 2025-06-22 | Anticipo Adrián Alejandro | 1,000 | Adrian Alejandro Castro Cantu |
| 2025-06-28 | Liquidación Catherine | 12,473 | Catherine |
| 2025-07-08 | Anticipo Raquel Alejandra | 1,500 | Alejandra Gamez |
| 2025-07-09 | Pago Monica | 7,000 | Mónica Ramos |
| 2025-07-09 | Pago Manolo porcion tarjeta | 8,000 | Manolo |
| 2025-07-09 | Pago Manolo porcion cash | 37,000 | Manolo |
| 2025-07-11 | Depósito Monica | 3,000 | Mónica Ramos |
| 2025-07-15 | Anticipo Sergio Guadiana | 2,000 | Sergio Guadiana |
| 2025-07-17 | Mensualidad Mónica | 7,500 | Mónica Ramos |
| 2025-08-15 | Hilario Ingreso | 1,000 | Hilario Espindola Moreno |
| 2025-08-15 | Liquidación Mónica | 5,000 | Mónica Ramos |
| 2025-08-22 | Mónica Argolla | 1,500 | Mónica Ramos |
| 2025-09-12 | Anticipo Edson | 30,000 | Edson Carrera |
| 2025-10-04 | Edson Pago | 39,600 | Edson Carrera |
| 2025-10-08 | Ingreso Jorge amigo Fer | 10,000 | Jorge amigo Fer |
| 2025-10-11 | Liquidación Bocanegra | 31,090 | Miguel Bocanegra |
| 2025-10-12 | Juan Vega | 6,000 | Juan Vega |
| 2025-10-23 | Liquidación Adrián anillo | 34,000 | Adrian Alejandro Castro Cantu |
| 2025-10-25 | Anticipo Argollas José Eduardo | 7,000 | José Eduardo Martínez |
| 2025-10-26 | Ingreso Jorge Garcia Argollas | 5,373 | Jorge García Rodríguez |
| 2025-10-26 | Ingreso Elías | 6,716 | Elías Leal |
| 2025-10-26 | Ingreso Maria de Lourdes A22 | 10,000 | María de Lourdes Pérez Lozano |
| 2025-10-30 | Ingreso anillo Alejandro Morales Aguilera | 8,635 | Alejandro Morales Aguilera |
| 2025-11-01 | Mensualidad David Velasco | 10,000 | David Velasco |
| 2025-11-01 | Ingreso Elías Argollas | 37,417 | Elías Leal |
| 2025-11-04 | Ingreso liquidacion Lourdes | 25,000 | María de Lourdes Pérez Lozano |
| 2025-11-07 | Reembolso Diamantes Sergio | 15,000 | Sergio Guadiana |
| 2025-11-07 | Alejandra Churumbela liquidación parcial 1 | 4,500 | Alejandra Gamez |
| 2025-11-09 | Liquidacion Alejandra | 9,000 | Alejandra Gamez |
| 2025-11-10 | Liquidación Elías | 26,863 | Elías Leal |
| 2025-11-11 | Hilario Liquidación | 16,500 | Hilario Espindola Moreno |
| 2025-11-13 | Anticipo Antonio Lupercio | 7,000 | Antonio de Jesús Lupercio Veléz |
| 2025-11-13 | Anticipo Mauricio Treviño | 8,000 | Mauricio Treviño Ñañez |
| 2025-11-14 | Carlos Liquidación | 25,000 | Carlos Andrés de los Santos Álvarez |
| 2025-11-19 | Liquidación Rosciano | 20,000 | Eduardo Lozano Rosciano |
| 2025-11-20 | Anticipo Gerardo Reyes | 9,594 | Gerardo Rodolfo Reyes Acevedo |
| 2025-11-22 | Anticipo Alexandra | 6,000 | Alexandra Garza |
| 2025-12-06 | Liquidación David Velasco | 9,000 | David Velasco |
| 2025-12-10 | Pago upgrade Piedra Gerardo Reyes | 4,000 | Gerardo Rodolfo Reyes Acevedo |
| 2025-12-12 | Gerardo Martínez venta | 9,000 | Gerardo Martínez |
| 2025-12-12 | Liquidación Elías | 10,553 | Elías Leal |
| 2025-12-12 | Lupercio Liquidación | 31,660 | Antonio de Jesús Lupercio Veléz |
| 2025-12-15 | Liquidacion Gerardo Martinez | 36,000 | Gerardo Martínez |
| 2025-12-23 | Pago Gerardo Reyes | 4,500 | Gerardo Rodolfo Reyes Acevedo |
| 2026-01-01 | Pago Gerardo Reyes | 7,000 | Gerardo Rodolfo Reyes Acevedo |
| 2026-01-02 | Ingreso Michelle Martínez Anticipo | 14,391 | Michelle Martínez García |
| 2026-01-22 | Alejandro Morales liquidación | 34,538 | Alejandro Morales Aguilera |
| 2026-02-06 | Liquidacion Jose Eduardo | 29,100 | José Eduardo Martínez |
| 24-Abr-26 | Michelle Martinez | 20,000 | Michelle Martínez García |
| 2026-05-17 | Ingreso Oswaldo Expo | 1,000 | Oswaldo Villarreal |
| 2026-05-17 | Ingreso Separación Expo Luis Daniel Luna | 1,000 | Daniel Luna |
| 2026-06-06 | Anticipo Luis Saucedo argollas | 1,000 | Luis Saucedo |
| 2026-06-06 | Anticipo Negociadora Mariel Lopez | 5,000 | Mariel Lopez |
| 2026-06-06 | Anticipo Negociadora Mariel Lopez | 5,000 | Mariel Lopez |
| 2026-06-06 | Anticipo Negociadora Mariel Lopez | 5,000 | Mariel Lopez |
| 2026-06-07 | Ingreso Edson Argollas | 12,000 | Edson Carrera |
| 2026-06-07 | Cecia Argollas separación | 1,000 | Cecia González |
| 2026-06-30 | Churumbela Manolo | 9,750 | Manolo |
| 2026-06-30 | Ingreso Jorge tio fer | 30,000 | Jorge tio fer |
| 2026-06-19 | Manolo liquidación argollas | 27,500 | Manolo |
| 2026-07-11 | Ingreso Mau Rada Transf | 12,000 | Mauricio Rada Chau |
| 2026-07-11 | Ingreso Mau Rada Tarjeta | 1,500 | Mauricio Rada Chau |

</details>

### Ambiguos (26) — decidir a cuál cliente va cada uno

| Fecha | Concepto | Monto | Candidatos |
|---|---|---|---|
| 2025-04-26 | Ingreso piedra papá fer | 16,653 | Jorge amigo Fer / Jorge tio fer |
| 2025-07-16 | Gasto Pago deuda Fer | 151 | Jorge amigo Fer / Jorge tio fer |
| 2025-07-22 | Liquidacion José Sandoval | 35,000 | José Eduardo Martínez / José Blas Correa Chapa |
| 2025-07-30 | Juan Vera | 51,000 | Juan Vega / Juan PENDIENTE |
| 2025-09-20 | Anticipo Miguel | 2,878 | Miguel Bocanegra / Miguel Herrera |
| 2025-10-05 | Anticipo Miguel Dr Mamaguevo 1 | 1,000 | Miguel Bocanegra / Miguel Herrera |
| 2025-10-15 | Eduardo zz | 5,000 | Eduardo Lozano Rosciano / José Eduardo Martínez |
| 2025-10-28 | Ingreso anillo Jonathan | 5,000 | Jonathan Guillermo Sanmiguel / Jonathan González González |
| 2025-11-11 | Jorge Flores Liquidacion | 35,000 | Claudio Flores / Manuel Flores / Jorge amigo Fer |
| 2025-12-08 | Liquidación Jonathan | 29,000 | Jonathan Guillermo Sanmiguel / Jonathan González González |
| 2025-12-12 | Mauricio Liquidación | 37,000 | Mauricio Treviño Ñañez / Mauricio Rada Chau |
| 2026-01-09 | Liquidación Gerardo | 40,000 | Gerardo Martínez / Modesto Gerardo / Gerardo Rodolfo Reyes Acevedo |
| 2026-01-26 | Liquidación Juan | 23,000 | Juan Vega / Juan PENDIENTE |
| 2026-01-26 | Liquidación Juan | 1,420 | Juan Vega / Juan PENDIENTE |
| 2026-01-27 | Liquidacion Jorge | 25,808 | Jorge amigo Fer / Jorge García Rodríguez / Jorge tio fer |
| 2026-02-14 | Ingreso Jefe Fer Al precio | 17,000 | Jorge amigo Fer / Jorge tio fer |
| 2026-02-28 | Ingreso Juan Diamante | 25,000 | Juan Vega / Juan PENDIENTE |
| 2026-03-09 | Ingreso Marcos Reyes Anticipo anillo oval | 10,000 | Marcos Garza Ads / Gerardo Rodolfo Reyes Acevedo |
| 2026-03-21 | Ingreso Jonathan Anticipo | 25,000 | Jonathan Guillermo Sanmiguel / Jonathan González González |
| 2026-03-21 | Ingreso Sara Anticipo zafiro y rubi argollas señor de los anillos | 22,501 | Sara / Carlos Andrés de los Santos Álvarez |
| 2026-03-29 | Jonathan abono | 5,000 | Jonathan Guillermo Sanmiguel / Jonathan González González |
| 13-Abr-26 | Jonathan abono | 10,000 | Jonathan Guillermo Sanmiguel / Jonathan González González |
| 26-Abr-26 | Ingreso Marcos Reyes Liquidación | 25,000 | Marcos Garza Ads / Gerardo Rodolfo Reyes Acevedo |
| 2026-04-07 | Jonathan abono | 5,000 | Jonathan Guillermo Sanmiguel / Jonathan González González |
| 2026-05-13 | Luna Anticipo | 7,000 | Luna Hermano / Daniel Luna |
| 2026-05-22 | Liquidación Luna | 28,000 | Luna Hermano / Daniel Luna |

### Sin match (34) — apodos o clientes que no están en las sheets

| Fecha | Concepto | Monto |
|---|---|---|
| 2025-05-04 | Argollas raritos 2 | 12,952 |
| 2025-06-22 | Anticipo Anna Georgina | 1,000 |
| 2025-07-12 | Ingreso Zafiro Pitero Anticipo | 3,000 |
| 2025-07-31 | Cambio efvo a cuenta | 46,500 |
| 2025-08-15 | Ingreso Zafiro Pitero Liquidación | 27,000 |
| 2025-08-15 | Pago argolla grande y churumbela 2 | 4,500 |
| 2025-08-30 | Pago argolla grande y churumbela | 4,500 |
| 2025-09-22 | Deuda Carro Dolor | 2,500 |
| 2025-09-22 | Deuda Carro Dolor | 500 |
| 2025-10-17 | Mamaguevo liquidación | 44,000 |
| 2025-11-07 | Anticipo trenzado 3 oros | 6,800 |
| 2026-01-07 | Reembolso Wholesaler | 3,017 |
| 2026-02-16 | Estacionamiento | 14,000 |
| 2026-02-22 | Ingreso Gabriel | 1,000 |
| 2026-02-22 | Ingreso Gabriel | 4,000 |
| 2026-02-23 | Ingreso Fashion Show Anillo + Churumbela | 500 |
| 2026-02-26 | Ingreso Tortas 2 Rozen | 10,000 |
| 2026-03-13 | Tortas Ingreso Rozen | 3,000 |
| 2026-03-16 | Liquidación churumbela y argolla twisted fraude | 26,800 |
| 2026-03-24 | Torta anticipo Rozen | 3,000 |
| 25-Abr-26 | Liquidacion Tortas | 32,000 |
| 26-Abr-26 | Gabriel Liquidación Diamante | 5,000 |
| 26-Abr-26 | Gabriel Anticipo Anillo | 10,000 |
| 2026-05-08 | Liquidación Gabriel | 5,000 |
| 2026-05-17 | Ingreso Separación Expo | 1,000 |
| 2026-05-17 | Ingreso Separación Expo | 1,000 |
| 2026-05-17 | Ingreso Separación Expo | 1,000 |
| 2026-05-17 | Ingreso Separación Expo | 1,000 |
| 2026-05-17 | Ingreso Separación Expo | 1,000 |
| 2026-06-07 | Argolla zafiro | 1,000 |
| 2026-06-29 | Liqudación abogada funky | 33,625 |
| 2026-06-30 | Abono raritos zafiro | 5,000 |
| 2026-06-30 | Marquise liquidación | 19,000 |
| 2026-07-10 | Ingreso anticipo anillo radiant pavé | 20,000 |

## F-10 — Cobranza: saldos de Producción vs ingresos ligados de Contabilidad
Solo clientes identificables por teléfono (A9/R45, el "???" de R75 y Mau Rada quedan
aparte hasta que Santiago llene F-02). "Diferencia" = ingresos ligados − pagado según
Producción: **+** sugiere que Producción está atrasada (el cliente pagó más);
**−** sugiere pagos que no se lograron ligar por nombre.

| Cliente | Precio | Pagado (Prod) | Saldo (Prod) | Ingresos ligados | Diferencia |
|---|---|---|---|---|---|
| Sergio Guadiana | 70,000 | 2,000 | 68,000 | 17,000 | +15,000 |
| Sara | 75,000 | 22,500 | 52,500 | 0 | −22,500 |
| Claudio Flores | 39,250 | 1,000 | 38,250 | 0 | −1,000 |
| José Blas Correa Chapa | 38,000 | 1,000 | 37,000 | 0 | −1,000 |
| Héctor Flores Durán | 35,000 | 1,000 | 34,000 | 0 | −1,000 |
| Jonathan González González | 77,850 | 46,000 | 31,850 | 0 | −46,000 |
| Hugo Alejandro Carral Ibarra | 30,000 | 1,000 | 29,000 | 0 | −1,000 |
| Cecia González | 27,500 | 1,000 | 26,500 | 1,000 | 0 |
| Luis Saucedo | 22,000 | 1,000 | 21,000 | 36,000 | +35,000 |
| Daniel Luna | 22,000 | 1,000 | 21,000 | 1,000 | 0 |
| Adrian A. Castro Cantu | 55,000 | 36,000 | 19,000 | 35,000 | −1,000 |
| Edson Carrera | 93,600 | 81,600 | 12,000 | 81,600 | 0 |
| Montserrat Rodríguez | 15,000 | 6,000 | 9,000 | 0 | −6,000 |

**Casos que piden ojos humanos:** Sergio Guadiana (+15k: ¿abonó más de lo anotado?),
Luis Saucedo (+35k: puede ser un macheo a otro "Luis" — revisar), Jonathan González
(−46k: sus pagos en Contabilidad deben estar bajo otro texto), Sara y Montserrat
(pagos de Producción sin rastro en Contabilidad).

## F-14 — Cruce de subsets de inventario contra el maestro
- **Diamantes (35):** ya verificado por el escaneo — mismos IDs 10xx del maestro. El maestro manda. ✔
- **Gemas (44, sin ID):** cruzadas por tipo+quilataje contra las 38 piedras color del
  maestro: **36 SÍ están** en el maestro (se descartan sin pérdida). **8 NO aparecen:**
  6 zafiros grandes (2.00 Emerald, 2.20 Round/Cushion/Pear/Princess, 2.40 Heart — los
  únicos sin certificado GRC) y 2 de las 4 esmeraldas de 5.17ct (el maestro solo tiene 2).
  **Pregunta para Fer/Santiago:** ¿esas 8 son piezas físicas reales que faltan en el
  maestro (habría que darlas de alta con costo), o son líneas de pedido/plan que nunca llegaron?

## Churumbelas Ch1–Ch11 (F-29) — BLOQUEADO por herramienta
La lectura de Drive desde esta sesión solo devuelve la primera pestaña del libro
Inventario. Opciones: (a) Santiago pega aquí las ~13 filas de la pestaña Churumbelas,
o (b) se extraen en una sesión de Cowork. Son pocas filas; con eso se completa el CSV.

---

## Resoluciones de Santiago (2026-07-13, sesión interactiva)

**Decisiones generales:**
1. **Transferencias internas: CONFIRMADO** — los 29 movimientos ($388,051) entran como tipo `transferencia_interna`, fuera del P&L.
2. **Las 8 gemas sin match en el maestro: son piezas reales probablemente** — se dan de alta como items (sin ID de serie y con costo pendiente, marcadas `_pregunta_pendiente`).

**Ambiguos resueltos:**
- Sara "señor de los anillos" $22,501 → **Sara** (cierra su hueco de F-10). *(resuelto por Claude, contexto LOTR)*
- "Ingreso piedra papá fer" / "Gasto Pago deuda Fer" / "Ingreso Jefe Fer Al precio" ($33,804) → **financiamiento familiar**, no pagos de cliente.
- Mauricio Liquidación $37,000 (dic-25) → **Mauricio Treviño Ñañez**.
- Luna anticipo+liquidación $35,000 → **Luna Hermano** (Daniel Luna sigue debiendo sus $21k).
- Jonathan (7 movs, $84,000) → **repartir por cuadre** entre los dos Jonathans: asignación por monto/fecha de modo que cada pedido llegue a su precio; regla aprobada por Santiago ("si ya están liquidados repártelos").
- Juan (~$100,420) → **es un solo Juan (prob. Juan Vega, 'Vera'=typo)**; misma regla de reparto por cuadre contra sus pedidos.
- José Sandoval $35,000 → **cliente histórico nuevo** ("no se metió a los sheets de Producción"); se crea con su liquidación.

**Quedan para Fer (no bloquean el import; entran sin ligar):**
- "Jorge Flores Liquidacion" $35,000 + "Liquidacion Jorge" $25,808 (¿Claudio/Manuel Flores? ¿Jorge García?)
- "Liquidación Gerardo" $40,000 (¿cuál de los 3 Gerardos?)
- "Marcos Reyes" $35,000 (¿cliente nuevo?)
- Los ~30 sin-match restantes (apodos tipo Mamaguevo/Zafiro Pitero/abogada funky, "Gabriel" ~$25k, "Tortas Rozen" ~$48k, "Estacionamiento" $14k, "Separación Expo" ×5) — revisar con las sheets/memoria de Fer; mientras, entran como ingresos sin cliente.
