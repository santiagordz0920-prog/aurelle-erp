# MAPEO — Columnas origen → entidades del ERP

Cómo cada columna de las sheets alimenta las entidades destino (cliente, pedido, item, proveedor/consignante, movimiento, cita, expo). Formato: `origen (sheet/pestaña/col)` → `campo destino`. Al final de cada entidad: columnas sin destino y campos destino sin origen.

Todos los CSV llevan además: `_fila_origen` (trazabilidad exacta), `_confianza` (alta/media/baja), `_nota`, `_pregunta_pendiente` (código de FALTANTES).

---

## CLIENTE → `clientes.csv`
Fuente primaria: **Operaciones/Producción** (única con nombre + teléfono). Fuente secundaria: **Operaciones/Ventas** (solo nombre de pila).

| Campo destino | Origen | Confianza |
|---|---|---|
| `nombre` | Producción C `Nombre` (o Ventas D `Cliente` para los que solo están ahí) | alta / baja |
| `telefono` | Producción D `Telefono` (limpiado a solo dígitos) | alta |
| `otro_contacto` / segundo teléfono | Producción O `Notas` cuando trae "Esposa … + tel" (p.ej. R8) | media |
| `notas` | Producción O `Notas` (esposa/pareja) | media |

**Sin origen (quedan vacíos):** `correo`, `instagram`, `fuente` (ads/expo/referido/organico), `detalle_fuente`, `fecha_primer_contacto`, `etapa` (nuevo/…/cerrado), `interes`, `fecha_propuesta_boda`. Ninguna sheet los captura hoy. (La `etapa`/embudo existe conceptualmente en el CRM diseñado, pero **no** en estas sheets.)

**Columnas origen sin destino claro:** el consecutivo `Num Pedido` no es del cliente sino del pedido. El nombre de pila de Ventas se conserva solo para conciliación (posible duplicado).

Dedup: se agrupó Producción por teléfono. Los clientes de Ventas cuyo nombre de pila no aparece en Producción se incluyeron con `_confianza=baja` (posibles duplicados) — **no se fusionaron** con nadie (regla de conciliación).

---

## PEDIDO → `pedidos.csv`
Fuente primaria: **Operaciones/Producción**. Costos reales: **Operaciones/Ventas** (no ligados automáticamente).

| Campo destino | Origen | Nota |
|---|---|---|
| `telefono_cliente` (llave) | Producción D `Telefono` | 68/73 con tel |
| `descripcion_pieza` | Producción E `Item` | |
| `metal` | Producción G `Material` | |
| `piedra` | Producción I `ID Piedra` (liga a items) | limpia NA/-/pendiente |
| `talla` | Producción H `Talla` | |
| `precio_total` | Producción F `Costo` (**es precio al cliente, no costo**) | ⚠ etiqueta engañosa |
| `fecha_entrega_prometida` | Producción J `Fecha entrega` | formatos mixtos, texto |
| `estado` | Producción K `Status` → normalizado a apartado/en_produccion/entregado/cancelado | 48 entregado, 22 en_produccion, 3 vacío |
| `notas` | Producción O `Notas` + L `Siguiente Paso` + K `Status` original | |
| `costo_real_si_se_conoce` | *(vacío)* — está en Ventas (H `Costo Producto`, I `Costo Piedras`, J `Agustín`, K `Oro`) pero **no se ligó** por falta de llave común | ver FALTANTES |

**Sin origen:** `fecha_pedido` (Producción no la tiene; Ventas C `Fecha` es la de venta, no de pedido, y no se pudo ligar), `fecha_entregado` (solo hay status "entregado", sin fecha exacta).

**Columnas origen sin destino:** Producción A `Urgente?`, M `Fecha inicio`, P `Restante` (derivable de precio−pagos), Q (suma control). Se guardan como contexto en `_nota` cuando aportan.

Mapeo de `estado` (Status libre → enum): `ENTREGADO Y LIQUIDADO`→entregado; `DEUDORES DE COPPEL`/`Falta liquidar`→en_produccion (entregado con saldo, revisar); `Pedida`/`Aprobado`/`Mandado render chino`/`Falta …`→en_produccion; sin match→vacío. **"apartado" y "cancelado" no aparecen** explícitos en el origen.

---

## PAGO → `pagos.csv`
Dos orígenes, **deliberadamente no sumados** (se traslapan):
1. **Operaciones/Producción N `Pagos`** (71 filas): monto pagado agregado por pedido. `concepto`=liquidacion si `Restante=0`, si no anticipo. **Sin fecha ni método** en origen.
2. **Contabilidad/Transacciones, filas `Ingreso`** (171 filas): eventos reales de dinero entrante con **fecha** y método inferible del texto ("Transf"/"Tarjeta"/"Efectivo"/"Mercado").

| Campo destino | Origen |
|---|---|
| `telefono_cliente` | Producción D (solo en filas de Producción; vacío en las de Contabilidad) |
| `referencia_pedido` | Producción B `Num Pedido` |
| `monto` | Producción N / Contabilidad D `Cantidad` |
| `fecha` | *(solo Contabilidad C)* |
| `metodo` | inferido del texto del concepto (efectivo/transferencia/tarjeta) |
| `concepto` | anticipo / liquidacion / abono (inferido) |

**Sin origen fiable:** método y fecha de los pagos de Producción; teléfono/pedido de los pagos de Contabilidad (el nombre va embebido en el concepto, p.ej. "Anticipo Victor", "Liquidación Anillo Victor", "Ingreso Mau Rada Transf"). **La conciliación pago↔pedido↔cliente es el mayor trabajo manual** (ver FALTANTES).

---

## ITEM DE INVENTARIO → `items.csv`
Cuatro orígenes, con el maestro como canónico:

| Origen | Piezas | Rol |
|---|---|---|
| **Operaciones/Inventario Gemas** (B11:J113) | 103 | **Maestro**: diamantes + piedra color con costo (E) y estado (H) |
| **Inventario/Anillos Jefa** (A1–A27) | 27 | Consignación "La Jefa (mamá de Fer)" |
| **Inventario/Batch Jefa Local Joyeria** (Ar01–Ar126) | 114 | Consignación "Tío Fer (joyería local)" |
| **Inventario/Anillos** (A101–A106) | 4 | Anillos Aurelle terminados (posible duplicado del maestro) |

| Campo destino | Origen (maestro) |
|---|---|
| `descripcion` | Inventario Gemas D `Nombre Producto` |
| `tipo` | de `Categoría`/pieza → piedra/anillo/material |
| `piedra` | Inventario Gemas J `Corte` |
| `quilates` | parseado de la descripción (`1.52 ct`) |
| `estado` | Inventario Gemas H: INV→disponible, VEN→vendido, MON/FAB→reservado, MON EXPO→reservado, DUDA1→vacío | 
| `costo` | Inventario Gemas E `Costo Bruto`; consignación: F/G `COSTO`/`Precio total Tio Fer` |
| `proveedor_o_consignante` | "La Jefa (mamá de Fer)" / "Tío Fer (joyería local)"; vacío para diamantes wholesaler |
| `notas` | certificado (I), categoría, peso, precio Ellion, imagen |

**Sin origen:** `metal` para las piedras sueltas del maestro (el metal se define al montar); `fecha_adquisicion` (ninguna sheet la registra).

**Duplicados a reconciliar:** Inventario/Gemas (44, sin ID) y Inventario/Diamantes (35) son **subconjuntos** del maestro → **NO se re-migraron** para evitar duplicar; se dejan como tarea de cruce por certificado/quilataje (FALTANTES). Los "Anillos montados" de Operaciones/Anillos (IDs 1036…) también son piedras del maestro ya montadas → no se duplicaron.

**Columnas origen sin destino:** `Margen Bruto`/`Precio Bruto`/`Precio Ellion` (son precio de venta, no de item; útiles para Cotizador), `Imagen` (nombre de archivo → Media Library).

---

## PROVEEDOR / CONSIGNANTE → `proveedores.csv`
Reconstruido (ninguna sheet tiene un catálogo de proveedores). 6 registros inferidos: **La Jefa (mamá de Fer)** y **Tío Fer** (consignantes de inventario), **Agustín** (joyero/maquila), **Chino** (diseño/render CAD), **Forte** (proveedor de diamantes), **Papá Fer** (marcado como proveedor pero en realidad **socio capital/deuda ~$3.7M** — su destino real es cuenta por pagar/capital, no proveedor).

**Sin origen:** `contacto` (teléfono/correo) de todos — no está en las sheets. Nombres reales de "La Jefa" y "Tío Fer" por confirmar.

---

## MOVIMIENTO FINANCIERO → `movimientos.csv`
Fuente única: **Contabilidad/Transacciones** (902 filas).

| Campo destino | Origen |
|---|---|
| `fecha` | C `Fecha` (858 fecha real + 44 texto) |
| `tipo` | E `Clasificación` → Ingreso→ingreso, Gasto/Costo→gasto, Deuda→deuda, Pago Deuda→pago_deuda, Capital→capital |
| `categoria` | E `Clasificación` (valor original conservado) |
| `concepto` | B `Transacción` |
| `monto` | D `Cantidad` |
| `metodo` | inferido del texto (efectivo/transferencia/tarjeta) |
| `relacionado_con` | F `Fuente` (contraparte: Fer / Papá Fer / Santi / Efectivo) |

**Choque de esquema:** el destino solo prevé **ingreso/gasto**, pero el origen tiene 6 clases. **Deuda (217), Pago Deuda (48) y Capital (4)** son financiamiento/capital, no P&L → se conservaron con su tipo real y `_pregunta_pendiente=Q-FIN` para que definas su destino (cuentas por pagar / aportaciones de capital). **No se forzaron a ingreso/gasto.**

**Sin origen:** método real de la mayoría (solo se infiere cuando el texto lo dice). Vínculo a pedido/cliente específico (los ingresos traen nombre en el concepto, no llave).

---

## CITA → `citas.csv`
**No existe fuente.** Ninguna de las 5 sheets registra citas/agendas (fecha_hora, asistió, resultado). El CSV se entrega **solo con encabezados, 0 filas**. El módulo Citas del ERP arrancará vacío o se poblará desde WhatsApp/calendario a futuro. Ver FALTANTES.

---

## EXPO → `expos.csv`
Fuente: **Expos Bodas Mexico 2026** (25 filas).

| Campo destino | Origen |
|---|---|
| `nombre_expo` | col A |
| `ciudad` | col Ciudad |
| `fecha` | col `Fechas 2026 (verificar)` (texto con estatus embebido) |
| `estado` | derivado del texto: confirmado / por_verificar / ya_paso / por_identificar |

**Sin origen (vacío en las 25):** `costo` (Precio stand), `leads_capturados`, teléfono de contacto, asistentes. Es lista de prospección, no de expos ejecutadas. Las expos ya hechas (Expo Tu Boda 2025) están en Contabilidad como gastos, no aquí.

---

## Entidades destino que quedan sin (o casi sin) origen
- **cita**: sin fuente alguna.
- **cliente**: sin correo, instagram, fuente/campaña, etapa de embudo, interés, fecha de boda, fecha de primer contacto.
- **pedido**: sin fecha de pedido ni fecha exacta de entrega; costo real no ligado.
- **pago**: sin método/fecha en la mitad de origen (Producción); sin llave a cliente en la otra mitad (Contabilidad).
- **proveedor**: sin datos de contacto.
- **expo**: sin costo/leads/asistentes.

## Sheets/tabs que NO mapean a ninguna entidad (referencia)
Pricer v1 (5 tabs), Operaciones/Orgia, Operaciones/Precios, Operaciones/Pricer Fer zzz, Operaciones/Dolor culo, Contabilidad/Efectivo y deudas → alimentan **Cotizador / control**, no entidades. Operaciones/Catálogo y Inventario/Churumbelas → candidatos a **Catálogo / Base de conocimiento** (confirmar).
