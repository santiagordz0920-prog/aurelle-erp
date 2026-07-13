# INVENTARIO — Fuentes de datos Aurelle & Co.

Análisis honesto de las 5 fuentes de Google Sheets (Drive de nubomarket@gmail.com), previo a migración al ERP. **No se modificó ningún original**; todo se hizo sobre exports descargados el 12-jul-2026.

Convención de estados de color (confirmado por Santiago):
- **Producción (Operaciones):** los colores azul/verde/amarillo **NO significan nada** (formato heredado). Se ignoran.
- **Ventas (Operaciones):** rojo claro en celdas de costo = **"dato a revisar / probablemente falta el número claro"**. Migrado con `_confianza=media`.
- **Anillos Jefa (Inventario):** verde = **pieza ya vendida y entregada** (solo A9 y A22).
- **Diamantes (Inventario):** todas las filas en verde = estilo de tabla, sin significado discriminante.

Leyenda de tabs: **MIGRA** = se convierte en datos de entidad · **REFERENCIA** = herramienta/cálculo, no se migra como entidad · **IGNORAR** = scratch/vacía.

---

## 1. Operaciones v1
`id 1PGyxlqlELHSwY8Z-i2bluJ29BqlyC721hos8X4hfkGQ` · 9 pestañas · modificado 11-jul-2026

### 1.1 Ventas — **MIGRA** (ledger de ventas)
Rango `B2:Z53`. **49 ventas** con datos (filas 3–51; B52 tiene un "50" suelto sin datos).
Columnas reales (fila 2): `Producto` (B, es un consecutivo numérico, no el nombre), `Fecha` (C), `Cliente` (D), `Monto` (E), `Producto` (F, aquí sí el nombre de la pieza), `Fees` (G), `Costo Producto` (H), `Costo Piedras` (I), `Agustín` (J), `Oro` (K), `Profit Puro` (L, fórmula `=E-sum(G:K)`).
Columnas N–Z: tabla dinámica de resúmenes mensuales (SUMPRODUCT por mes) — **cálculo, no datos**.
Rango de fechas: **28-feb-2025 → 02-feb-2026**.
Problemas:
- **Cliente = nombre de pila** en las primeras filas (Victor, Luis, Eber, Mónica, Merlo, Manolo, Catherine) — imposible ligar con seguridad a Producción. Duplicación probable.
- Montos como **fórmulas** en varias filas (E31 `=36100-E32`, E33 `=32500/2`, K21 `=3*14*2500/24`) — el valor real depende del cálculo.
- Celdas de costo en **rojo** (J21,K21,J32,K32,J44,K44,J47,J49,K49,J50,K50,I51) = dato a revisar.
- Filas 42–43 (Heber Acosta) con **Monto = 0** (argollas trenzadas sin cobrar).
- Fila 36 "A22 Consignación" — venta de anillo de consignación, costo $21,000 (pago al consignante).
- **No hay teléfono, ni pagos parciales, ni fecha de entrega** en esta pestaña.
- No cuadra 1:1 con Producción (49 ventas vs 73 pedidos). Ver FALTANTES.

### 1.2 Producción — **MIGRA** (pedidos + pagos + teléfonos: la fuente más rica)
Rango `A1:T76`. Header en fila 3. **73 pedidos** (filas 4–76).
Columnas reales: `Urgente?` (A), `Num Pedido` (B), `Nombre` (C), `Telefono` (D), `Item` (E), `Costo` (F — **en realidad es el PRECIO total al cliente**), `Material` (G), `Talla` (H), `ID Piedra` (I, liga al inventario maestro), `Fecha entrega` (J), `Status` (K), `Siguiente Paso` (L), `Fecha inicio` (M), `Pagos` (N — monto pagado acumulado), `Notas` (O), `Restante` (P, `=F-N`). Q = suma de control.
Rango de fechas de entrega: valores reales de **ene-2025 a jun-2026** mezclados con texto.
Problemas:
- **`Fecha entrega` es un desastre de formatos mixtos**: fechas reales, `?`, `-`, `ASAP`, `Antes de Navidad`, `Febrero o Marzo`, `3era semana nov`, `Pendiente`, `Cuando llegue wholesaler`. No es columna de fecha usable directamente.
- **Fechas probablemente mal capturadas**: R20/R21/R33 muestran `2025-01-15` para pedidos que por contexto son de 2026 (año equivocado).
- **`Num Pedido` duplicado**: dos "33" (R39,R40), dos "67" (R74,R75). Las parejas de argollas comparten número.
- **Clientes/teléfonos incompletos**: R45 `PENDIENTE DE CONTRATO`, R50 `Juan PENDIENTE`, R74 tel `??`, R75 nombre y tel `???`, R76 tel `???`.
- `Status` (K) tiene **~15 variantes de texto libre** (`ENTREGADO Y LIQUIDADO`, `DEUDORES DE COPPEL`, `Aprobado diseño`, `Pedida`, `Producido`, `Mandado render chino`, `Falta liquidar`…) — hay que normalizar a un enum.
- La columna se llama **`Costo` pero es el precio al cliente** (N=Pagos, P=F−N=saldo lo confirman). Riesgo de malinterpretación en el import.
- `Pagos` (N) es un **monto agregado**, no pagos individuales con fecha/método.
- Notas ricas escondidas: R8 trae segundo teléfono + nombre de esposa dentro de `Notas`.

### 1.3 Anillos — **MIGRA** (dos sub-tablas)
Rango `B3:P31`. Dos tablas lado a lado:
- **"Anillos montados"** (B–G, 7 filas): `ID Aurelle` (1036,1044,1050,1040,1026,1049,1030), `ID Caja` (100–106), `Montura`, `Descripción`, `Precio expo`, `Precio fuera`. Son piedras del inventario maestro ya montadas en anillo.
- **"Anillos jefa"** (I–P, A1–A27): `ID Caja`, `MATERIAL`, `PIEDRA`, `TALLA`, `COSTO`, `PRECIO`. **Anillos en consignación** de la jefa. Verde en A9 y A22 = vendidos. (Duplica la pestaña "Anillos Jefa" del libro Inventario.)
Problema: la misma info de consignación vive en dos libros distintos → riesgo de duplicado.

### 1.4 Inventario Gemas — **MIGRA** (¡inventario maestro de piedras!)
Rango `A2:K2010` pero solo **~103 piezas reales** (filas 11–113). Ojo: el nombre "Gemas" engaña; arriba (filas 2–8) hay una mini-calculadora de precios, y abajo el inventario real.
Columnas reales (fila 10): `Número de serie` (B: 1001–1113), `Categoría` (C: DIAMANTES / PIEDRA COLOR), `Nombre Producto` (D), `Costo Bruto` (E), `Margen Bruto` (F), `Precio Bruto` (G), `Estado` (H: **INV/VEN/MON/FAB/CAM/MON EXPO/DUDA1**), `Número de serie`/certificado (I: LG… diamantes, G… piedras color), `Corte` (J).
**Esta es la fuente canónica de `items` (piedras/diamantes) con costo y estado.** Santiago confirma que sus IDs deben cuadrar con las piedras del libro Inventario (Gemas/Diamantes).
Problemas:
- Estados `DUDA1` / `DUDA 1` (R63 en col K, R66 en col H) sin resolver.
- Algunas filas sin `Número de serie` (R18, R21) pero con datos → piezas sin ID.
- Filas 2002–2010: restos de fórmulas de la calculadora, ignorar.

### 1.5 Pricer Fer zzz — **IGNORAR** (herramienta)
Rango `B2:P35`. Calculadora de cotización (duplicado con sufijo "zzz"). Santiago: *"es una herramienta"*. No migra.

### 1.6 Orgia — **REFERENCIA** (helper del pricer)
Rango `B2:G16`. Tabla de materiales y multiplicadores. Santiago: *"helper sheet para el pricer"*. No migra como entidad.

### 1.7 Precios — **REFERENCIA** (helper del pricer)
Rango `B2:V82`. Lista de materiales + matriz de precios. No migra como entidad.

### 1.8 Catálogo — **MIGRA como catálogo/referencia**
Rango `C2:W87`. Nombres de modelos por familia (Solitario, Pavé, Halo, Unique, Argollas, Churumbela, Round, Princess, Pera…). Santiago: *"son modelos que podemos pedir de china y vender aquí, sería bueno tenerlo"*. No es una de las 8 entidades; sugerido para el módulo **Base de conocimiento / Catálogo** del ERP. Contiene colores variados (verde/amarillo) cuyo significado no se preguntó.

### 1.9 Dolor culo — **IGNORAR** (herramienta)
Rango `A2:I21`. Hoja de costeo de piezas (Fashion/Expo/Cliente previo). Santiago: *"también es una herramienta"*. No migra.

---

## 2. Contabilidad v1
`id 1vwobuiajCFsbxPfOQlJG7mNfUtyAXtbteQ8ANZUsOrs` · 2 pestañas · modificado 11-jul-2026

### 2.1 Transacciones — **MIGRA** (movimientos financieros)
Rango `A1:O2038`. Header en fila 2. **902 movimientos** (filas 3–904).
Columnas reales: `Transacción` (B, concepto), `Fecha` (C), `Cantidad` (D), `Clasificación` (E), `Fuente` (F, contraparte de deudas), `Log Cuadrar` (G, bitácora de cuadres).
Rango de fechas: **15-feb-2025 → 11-jul-2026** (¡vigente, llega a hoy!).
> Corrección a memoria previa: el registro **NO** corta a mediados de diciembre 2025; está actualizado a hoy.
Clasificaciones (conteo): **Gasto 385, Deuda 217, Ingreso 171, Costo 77, Pago Deuda 48, Capital 4**.
`Fuente` solo se usa en deudas: Fer 128, Papá Fer 103 (+1 "Papá fer" mal escrito), Efectivo 145, Santi 28.
Problemas:
- **44 fechas en formato TEXTO** (p.ej. `15-Feb-25`, `4-June-26`) contra 858 fechas reales → parseo mixto.
- Inconsistencia `Papá Fer` vs `Papá fer`.
- Las clases **Deuda / Pago Deuda / Capital** NO son ingreso/gasto de operación; son financiamiento/capital. El esquema destino solo prevé ingreso/gasto → decisión de mapeo pendiente (ver FALTANTES).
- Muchos montos con decimales largos de fórmula (`60.59999999999991`).
- Columnas H–O aparecen vacías (los cuadres viven inline en G).

### 2.2 Efectivo y deudas — **REFERENCIA** (resumen calculado)
Rango `B2:D9`. Balance resumido: Efectivo 0, Cash 0, Cuentas banco 0, **Deudas $3,708,934.27** (Papá fer $3,708,198.59, Fer $500, Santi $235.68). Es un tablero calculado a partir de Transacciones; no migra como registros, pero sirve de **cifra de control** para validar la migración de movimientos.

---

## 3. Inventario
`id 1c6pV9MBO4_jAilimwkpIQaRaVgGNJbiuAnMaRGrKIGI` · 7 pestañas · modificado 11-jul-2026

### 3.1 Gemas — **MIGRA con reconciliación** (subset de piedras color)
Rango `B2:H46`. **44 piedras**. Columnas: `Tipo`, `LAB/NAT`, `Color`, `Corte`, `Certificado`, `Quilataje`, `Medidas`.
Problema: **no tiene ID/serie ni costo ni estado** → hay que cruzarla con el maestro (Operaciones/Inventario Gemas) por tipo+quilataje+corte, cruce imperfecto. Ver FALTANTES.

### 3.2 Diamantes — **MIGRA con reconciliación** (subset de diamantes)
Rango `B1:M1000`, **35 diamantes** (filas 3–37). Columnas: `ID`, `Forma`, `Quiltaje`, `Color`, `Claridad`, `Corte`, `LAB/NAT`, `Certificado`, `Proceso`. Todas en verde (sin significado). Subset del maestro (mismos IDs 10xx). **Sin costo ni estado** → el maestro manda.

### 3.3 Anillos — **MIGRA** (anillos Aurelle terminados)
Rango `B2:N22`, solo **4–6 filas con datos** (A101, A103, A104, A106). Columnas: `ID`, `Material`, `Talla`, `Diseño`, `Forma`, `Quiltaje`, `Color`, `Claridad`, `Corte`, `LAB/NAT`, `Certificado`, `Proceso`, y una columna N con precio (`45k`, `40k`, `35k`). Posible duplicado de piedras del maestro ya montadas.

### 3.4 Sheet9 — **IGNORAR** (vacía)
Rango `A1:A1`, **0 filas**. Santiago: *"no sé qué hace"*. Vacía → ignorar (confirmar que no se borre nada importante).

### 3.5 Batch Jefa Local Joyeria — **MIGRA** (consignación grande de Tío Fer)
Rango `B1:K167`, **~114 piezas** (Ar01–Ar126). Columnas: `ID`, `Tipo Pieza`, `Material`, `Diamantes`, `Peso total (gr)`, `Precio total Tio Fer` (costo/consignante), `Margen Bruto`, `Precio Ellion` (venta), `Imagen`.
Es inventario en consignación de **Tío Fer / joyería local**. Los `Precio Ellion` van de $20k a $430k.

### 3.6 Anillos Jefa — **MIGRA** (consignación A1–A27)
Rango `B2:H29`, **27 anillos**. Columnas: `ID Caja` (A1–A27), `MATERIAL`, `PIEDRA`, `TALLA`, `COSTO`, `PRECIO`. Verde en A9 y A22 = **vendidos**. Duplica la sub-tabla "Anillos jefa" de Operaciones/Anillos.

### 3.7 Churumbelas — **REFERENCIA / catálogo**
Rango `B2:D16`, **~13 filas**. Códigos de modelo (AR, Ch1–Ch11) con nombres de diseño; algunos marcados `VENDIDA` / `MURIO` como código. Santiago: *"no sé qué hay en churumbelas"*. Parece lista-catálogo de modelos de eternity band, no inventario físico. **Se marca como "¿se migra o se ignora?"** — ver FALTANTES.

---

## 4. Pricer v1 — **REFERENCIA (todo el libro)**
`id 1L-bCfwqHjW8igDDUJpYattFLYPLLLh0VEKxT-sbfy_A` · 5 pestañas. Santiago: *"es una herramienta para sacar precios"*.
- `Aleaciones` (`A1:AC1008`, 30 filas útiles): cotizaciones de metales, densidades, aleaciones. Fuente de precios de metal en tiempo real (con URLs de Kitco/Amazon).
- `Compromiso Back-end` (`B2:AL62`, 53 modelos): motor de precio de anillos de compromiso.
- `Argollas Back-end` (`B2:AE61`, 45 modelos): motor de precio de argollas.
- `Churumbelas Back-end` (`B1:AH68`, 63 filas): motor de precio de churumbelas.
- `Pricer Express` (`B1:E19`): tabla rápida de precios por ct.
No contiene registros de entidad; **alimenta el módulo Cotizador** del ERP, no las 8 entidades.

---

## 5. Expos Bodas Mexico 2026.xlsx
`id 1ekLQ2nA2UyNuJretlZDnLzOS9DcE4JIW` · archivo .xlsx nativo · 1 pestaña · modificado 03-jul-2026

### 5.1 (hoja única) — **MIGRA** (lista de prospección)
**25 expos** prospecto. Columnas: `Expos Bodas MX Expo`, `Organizador`, `Ciudad`, `Estado`, `Recinto`, `Sitio web / Red social`, `Fechas 2026 (verificar)`, `Precio stand por día (MXN)`, `Teléfono de contacto`, `Asistentes promedio`, `Notas / Estatus investigación`.
Problemas:
- Es una **lista de investigación 2026**, no de expos ya realizadas: `Precio stand`, `Teléfono`, `Asistentes` y leads están **vacíos** en las 25 filas.
- Muchas fechas dicen `(verificar)`, `(confirmado)`, `(ya pasó)`, `(identificar)` → estatus embebido en texto.
- **Las expos YA hechas** (Expo Tu Boda feb–mar 2025, con gastos "Expo Tu Boda", "Joyapak Expo tu Boda", "Fashion Show") **no están aquí**: viven en Contabilidad. Reconciliación pendiente.

---

## Resumen de decisiones de tabs

| Migra | Referencia / Ignorar |
|---|---|
| Operaciones: Ventas, Producción, Anillos, Inventario Gemas, Catálogo | Operaciones: Pricer Fer zzz (IGN), Orgia (REF), Precios (REF), Dolor culo (IGN) |
| Contabilidad: Transacciones | Contabilidad: Efectivo y deudas (REF/control) |
| Inventario: Gemas, Diamantes, Anillos, Batch Jefa, Anillos Jefa | Inventario: Sheet9 (IGN, vacía), Churumbelas (¿migra? preguntar) |
| Expos: hoja única | Pricer v1: las 5 pestañas (REF) |
