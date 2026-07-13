# FALTANTES — Lista de conciliación

Una pregunta concreta por cada hueco o contradicción. **Regla: aquí no se resolvió nada con supuestos.** Contéstenlas los socios una por una. Cada pregunta tiene un código; los CSV traen ese código en `_pregunta_pendiente` para saber qué filas dependen de la respuesta.

Códigos: **Q-CLI** clientes · **Q-PAY** pagos · **Q-ITEM** inventario · **Q-A9** anillo A9 · **Q-PROV** proveedores · **Q-FIN** financiamiento · **Q-EXPO** expos.

---

## A. Clientes (Q-CLI)

**F-01.** Clientes que solo aparecen en Ventas con **nombre de pila** y sin teléfono. ¿Quién es cada uno (nombre completo + teléfono) y son clientes distintos o duplicados de alguien en Producción?
- Victor (Ventas R3, 28-feb-2025, $35,000) — ¿es el mismo "Victor" de los anticipos en Contabilidad?
- Eber (Ventas R5 y R6, mar-2025, $18,000 y $42,000)
- Javier (Ventas R7 y R8, 05-abr-2025, $10,000 y $13,500)
- Merlo (Ventas R11, 18-may-2025, $62,500 — "Tiffany Merlo")
- Manolo (Ventas R12, 29-may-2025, $50,000 — "sencillo 2ct")
- Catherine (Ventas R13, 22-jun-2025, $14,000 — "Azalea")
- Ezequiel (Ventas R20, 12-jul-2025, $30,000 — "zafiro bicolor")

**F-02.** Pedidos de Producción con **cliente/teléfono incompleto**. ¿Nombre y teléfono reales?
- R45 "PENDIENTE DE CONTRATO" (A9 anillo mamá Fer, saldo $18,500)
- R50 "Juan PENDIENTE", tel PENDIENTE (piedra suelta $25,000, ya entregado)
- R74 "Jorge tio fer", tel `??` ($30,000, entregado)
- R75 nombre y tel `???` (Radiant 1.5ct pavé, saldo $15,000)
- R76 "Mauricio Rada Chau", tel `???` (Emerald 2ct, saldo $31,500) — ¿es el mismo "Mau Rada" de los ingresos del 11-jul en Contabilidad?

**F-03.** ¿De qué **fuente** llegó cada cliente (ads / expo / referido / orgánico) y con qué campaña/expo? Ninguna sheet lo registra y es clave para el CRM. ¿Existe esa info en WhatsApp o en otro lado?

**F-04.** ¿Hay **correo, Instagram y fecha tentativa de boda** de los clientes en algún lado? Hoy van vacíos.

---

## B. Pedidos y su relación con Ventas (Q-PAY, Q-CLI)

**F-05.** Producción tiene **73 pedidos** y Ventas **49 ventas**, y no cuadran 1:1. ¿Ventas es solo "lo ya cobrado/entregado" y Producción es "todo el pipeline"? Necesito la regla para no duplicar ni perder pedidos al importar.

**F-06.** El **costo real** de cada pieza (Oro, Piedras, Agustín, Fees) solo está en Ventas y **no se pudo ligar** a los pedidos de Producción (no hay llave común, los nombres difieren). ¿Cómo emparejo cada venta de Ventas con su pedido de Producción? (Propuesta: por nombre + monto + fecha, pero requiere tu validación caso por caso.)

**F-07.** Las celdas de costo en **rojo** de Ventas (J21, K21, J32, K32, J44, K44, J47, J49, K49, J50, K50, I51) están marcadas como "dato a revisar / falta el número claro". ¿Cuál es el costo correcto de cada una?

**F-08.** Ventas R42 y R43 (**Heber Acosta**, dos argollas trenzadas) tienen **monto $0**. ¿Fue cortesía, aún no se cobra, o falta capturar el precio?

---

## C. Pagos (Q-PAY)

**F-09.** En Producción la columna `Pagos` es un **monto acumulado sin fecha ni método**. Los pagos individuales (anticipo, abonos, liquidación) con fecha y método están en Contabilidad como "Ingreso". ¿Confirmas que debo tomar los eventos con fecha de **Contabilidad** como los pagos reales, y usar el agregado de Producción solo para validar el total? (Hoy los entrego **separados y sin sumar** para no duplicar.)

**F-10.** Pedidos con **saldo pendiente** (precio − pagado > 0). ¿Cuál es el estatus de cobranza real de cada uno (se pagó ya, cuánto y cuándo)? Casos:

| Fila Producción | Cliente | Precio | Pagado | Saldo | Status origen |
|---|---|---|---|---|---|
| R8 | Adrian Alejandro Castro Cantu | 20,000 | 1,000 | 19,000 | DEUDORES DE COPPEL |
| R11 | Sergio Guadiana | 70,000 | 2,000 | 68,000 | DEUDORES DE COPPEL |
| R45 | (PENDIENTE DE CONTRATO / A9) | 19,000 | 500 | 18,500 | Falta liquidar |
| R48–R49 | Sara (2 piezas LOTR) | 37,500 c/u | 11,250 c/u | 26,250 c/u | Aprobado diseño |
| R52 | Héctor Flores Durán | 35,000 | 1,000 | 34,000 | Producido |
| R54–R55 | Claudio Flores | 20,000 / 19,250 | 500 c/u | 19,500 / 18,750 | Pedida / Aprobado |
| R56–R57 | Daniel Luna | 8,250 / 13,750 | 500 c/u | 7,750 / 13,250 | Aprobado / resize |
| R58 | José Blas Correa Chapa | 38,000 | 1,000 | 37,000 | Render chino |
| R59–R60 | Jonathan González González | 18,000 / 14,850 | 500 c/u | 17,500 / 14,350 | Pedida / Aprobado |
| R61 | Hugo Alejandro Carral Ibarra | 30,000 | 1,000 | 29,000 | Render chino |
| R62–R63 | Luis Saucedo | 13,750 / 8,250 | 500 c/u | (ver F-11) | Diseño aprobado |
| R67–R68 | Edson Carrera | 15,000 / 9,000 | 6,000 c/u | 9,000 / 3,000 | Render chino |
| R69–R70 | Cecia González | 13,750 c/u | 500 c/u | 13,250 c/u | Falta diseño |
| R71 | Montserrat Rodríguez | 15,000 | 6,000 | 9,000 | (vacío) |
| R75 | (???) | 35,000 | 20,000 | 15,000 | Falta recibir chino |
| R76 | Mauricio Rada Chau | 45,000 | 13,500 | 31,500 | Falta hacer diseño |

**F-11.** **Fórmula rota**: en Producción R62 y R63 (Luis Saucedo) el `Restante` usa `=F62-M62` / `=F63-M63` (apunta a `Fecha inicio`, columna M) en vez de `=F-N` (Pagos). Por eso el saldo aparece igual al precio. ¿El saldo correcto es 13,250 y 7,750 respectivamente (precio − $500)?

**F-12.** Los ingresos de Contabilidad traen el nombre embebido en el concepto ("Anticipo Victor", "Liquidación Anillo Victor", "Ingreso Mau Rada Transf/Tarjeta"). ¿Me confirmas el mapeo nombre→cliente/pedido para poder ligarlos? Son 171 ingresos.

---

## D. Inventario (Q-ITEM, Q-A9)

**F-13.** **Contradicción del anillo A9.** En Inventario/Anillos Jefa, A9 está en **verde = vendido y entregado**; pero en Producción R45 el mismo "A9 anillo mamá fer" dice **"Falta liquidar", saldo $18,500**. ¿A9 ya se vendió/entregó o sigue con saldo? ¿Cuál gana?

**F-14.** **Duplicados de inventario a cruzar.** El maestro (Operaciones/Inventario Gemas, 103 piezas con ID y costo) se solapa con Inventario/Gemas (44, **sin ID**) e Inventario/Diamantes (35). No los re-migré para no duplicar. ¿Puedo tratar el maestro como única verdad y descartar los otros dos, o hay piezas en Gemas/Diamantes que NO estén en el maestro? El cruce de Gemas (sin ID) tendría que ser por tipo+quilataje+corte (impreciso). ¿Existe una tabla puente de IDs?

**F-15.** Piezas del maestro con **estado `DUDA1`/`DUDA 1`**: serie 1020 (R66) y 1041 (R63, marca "DUDA 1" en otra columna). ¿Cuál es su estado real (disponible/vendido/montado)?

**F-16.** Maestro con **filas sin número de serie** pero con datos (Inventario Gemas R18 "Emerald 1.68 D VVS1", R21 "Emerald 2.05 D VVS1"). ¿Qué ID les corresponde?

**F-17.** Inventario/Anillos (A101–A106, anillos Aurelle terminados con precio 35k–45k): ¿son piezas físicas independientes o son piedras del maestro ya montadas (duplicado)? Afecta si se cuentan como inventario propio.

**F-18.** Estado de las piezas: mapeé INV→disponible, VEN→vendido, MON/FAB/MON EXPO→reservado. ¿Correcto? ¿Qué significan exactamente **CAM** y **MON EXPO** (montado en expo = ¿reservado o disponible para venta en piso?)?

**F-19.** Recordatorio de negocio: los anillos de consignación (A1–A27 de La Jefa y Ar01–Ar126 de Tío Fer) **no son inventario propio**. ¿Confirmas que en el ERP entran como inventario en consignación (no suman a capital ni a margen de producto propio)?

---

## E. Proveedores / consignantes (Q-PROV)

**F-20.** Nombres y contactos reales de los consignantes: **"La Jefa" (mamá de Fer)** — ¿es María de Lourdes Pérez Lozano (aparece en Producción R22)? — y **"Tío Fer"** (joyería local del batch Ar). ¿Teléfono/correo de cada uno?

**F-21.** **Papá Fer**: lo puse como proveedor solo por trazabilidad, pero es socio de **capital/deuda (~$3.7M)**. ¿Su destino correcto es cuenta por pagar + capital, y NO proveedor de material? Igual con **Fer** y **Santi** en la tabla de deudas.

**F-22.** ¿Agustín, "Chino" (diseño/render) y "Forte" (diamantes) son los proveedores de servicio/materia prima a registrar, o hay más (labs GIA/IGI/GRC, wholesaler de diamantes, aduanas)? ¿Datos de contacto?

---

## F. Movimientos financieros (Q-FIN)

**F-23.** **Choque de esquema.** El destino solo prevé ingreso/gasto, pero Contabilidad tiene 6 clases. ¿A dónde va cada una en el ERP?
- **Deuda** (217 filas) → ¿cuenta por pagar / préstamo recibido?
- **Pago Deuda** (48) → ¿abono a cuenta por pagar?
- **Capital** (4) → ¿aportación de socios?
- **Costo** (77) → lo mapeé a gasto (costo de venta). ¿Correcto?
Las de Deuda/Pago Deuda/Capital NO las forcé a ingreso/gasto; van con su tipo real y `_pregunta_pendiente=Q-FIN`.

**F-24.** **44 fechas en formato texto** en Transacciones (p.ej. "15-Feb-25", "4-June-26"). Las dejé tal cual. ¿Las normalizo a fecha ISO al importar, o hay riesgo de ambigüedad de año?

**F-25.** La pestaña "Efectivo y deudas" dice **Efectivo/Cash/Bancos = $0** y **Deudas $3.7M**. ¿El saldo de caja realmente es cero hoy, o esa pestaña está desactualizada? Sirve como cifra de control del import.

---

## G. Citas (sin fuente)

**F-26.** **No hay ninguna fuente de citas/agenda** en las 5 sheets. `citas.csv` va vacío (solo encabezados). ¿Las citas viven en otro lado (Google Calendar, WhatsApp, agenda física) que deba integrar, o el módulo Citas del ERP arranca desde cero?

---

## H. Expos (Q-EXPO)

**F-27.** "Expos Bodas Mexico 2026" es una **lista de prospección**: sin costo de stand, sin teléfono, sin asistentes, sin leads en las 25 filas. ¿Esos datos existen en otro lado o hay que investigarlos?

**F-28.** Las expos **ya realizadas** (Expo Tu Boda feb–mar 2025, Fashion Show, Expo Grande) aparecen como **gastos en Contabilidad**, no en la hoja de Expos. ¿Quieres que cree registros de expo históricos a partir de esos gastos (fechas y costos aproximados), o el módulo Expos solo lleva las futuras?

---

## I. Pestañas dudosas (¿se migra o se ignora?)

**F-29.** **Inventario/Churumbelas** (códigos AR, Ch1–Ch11 con nombres de modelo; algunos marcados "VENDIDA"/"MURIO"). No supiste qué contiene. ¿Es catálogo de modelos de churumbela (→ Base de conocimiento) o inventario físico? ¿Migrar o ignorar?

**F-30.** **Operaciones/Catálogo** (modelos pedibles de China). Lo marcaste como "sería bueno tenerlo". ¿Lo migro al módulo **Catálogo/Base de conocimiento** del ERP? No es una de las 8 entidades.

**F-31.** **Inventario/Sheet9** está vacía. La ignoro. ¿Confirmas que no había nada ahí que se deba conservar?
