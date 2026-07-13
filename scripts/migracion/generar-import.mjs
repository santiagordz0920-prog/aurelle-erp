/*
  Generador del import de las sheets (Fase 3 de docs/MIGRACION_DATOS.md).

  Lee docs/migracion/csv/*.csv + las resoluciones de la conciliación
  (resoluciones.mjs) y produce:
    - scripts/migracion/out/import_sheets.sql  (idempotente y reversible por lote)
    - scripts/migracion/out/reporte.md         (qué se generó, ligas y pendientes)

  Correr:  node scripts/migracion/generar-import.mjs
  El SQL corre primero en Postgres local (dry-run); a prod SOLO con confirmación
  explícita de Santiago (regla dura de CLAUDE.md).
*/
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as R from "./resoluciones.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CSV = (n) => join(RAIZ, "docs", "migracion", "csv", n);
const OUT = join(dirname(fileURLToPath(import.meta.url)), "out");
mkdirSync(OUT, { recursive: true });

/* ── utilerías ─────────────────────────────────────────────────────────── */
function parseCsv(texto) {
  const filas = [];
  let fila = [], campo = "", enComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enComillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') enComillas = false;
      else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === ",") { fila.push(campo); campo = ""; }
    else if (c === "\n") { fila.push(campo); filas.push(fila); fila = []; campo = ""; }
    else if (c !== "\r") campo += c;
  }
  if (campo.length || fila.length) { fila.push(campo); filas.push(fila); }
  const [head, ...resto] = filas;
  return resto
    .filter((f) => f.length > 1 || f[0] !== "")
    .map((f) => Object.fromEntries(head.map((h, i) => [h, (f[i] ?? "").trim()])));
}
const leer = (n) => parseCsv(readFileSync(CSV(n), "utf8"));
const esc = (s) => String(s).replace(/'/g, "''");
const lit = (s) => (s === null || s === undefined || s === "" ? "null" : `'${esc(s)}'`);
const num = (s) => (s === null || s === undefined || s === "" ? null : Math.round(parseFloat(s) * 100) / 100);
const norm = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ");
const slug = (s) => norm(s).trim().replace(/\s+/g, "-");

const MESES = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12 };
function fechaISO(s) {
  if (!s) return null;
  s = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[-/ ]([A-Za-zÁ-ú]+)[-/ ](\d{2,4})$/);
  if (!m) return null;
  const mes = MESES[norm(m[2]).slice(0, 3)];
  if (!mes) return null;
  const anio = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
  return `${anio}-${String(mes).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
}
const filaN = (origen) => origen.split("/R").pop();

/* ── carga ─────────────────────────────────────────────────────────────── */
const clientesCsv = leer("clientes.csv");
const pedidosCsv = leer("pedidos.csv");
const itemsCsv = leer("items.csv");
const movsCsv = leer("movimientos.csv");
const exposCsv = leer("expos.csv");

const LOTE = randomUUID();
const sql = [];
const reporte = [];
const bloques = { proveedor: 0, consignante: 0, cliente: 0, item: 0, pedido: 0, pago: 0, movimiento: 0, expo: 0, nota: 0 };

function bloque(cuerpo) {
  sql.push(`do $mig$\ndeclare\n  v_id uuid;\n  v_existente uuid;\nbegin\n${cuerpo}\nend $mig$;`);
}
const yaImportado = (tabla, llave) =>
  `  if exists (select 1 from public.migracion_registro where tabla = '${tabla}' and llave = ${lit(llave)}) then return; end if;\n`;
const registrar = (tabla, llave, fila, creado = "true") =>
  `  insert into public.migracion_registro (lote_id, tabla, registro_id, llave, fila_origen, creado)\n  values ('${LOTE}', '${tabla}', v_id, ${lit(llave)}, ${lit(fila)}, ${creado});\n`;

/* ── 1. proveedores y consignante ──────────────────────────────────────── */
for (const p of R.PROVEEDORES) {
  const llave = `prov:${slug(p.nombre)}`;
  bloque(
    yaImportado("proveedor", llave) +
      `  insert into public.proveedor (nombre, categorias, notas)\n` +
      `  values (${lit(p.nombre)}, array[${p.categorias.map((c) => lit(c)).join(",")}]::text[], ${lit(p.notas)})\n` +
      `  returning id into v_id;\n` +
      registrar("proveedor", llave, "resoluciones F-22")
  );
  bloques.proveedor++;
}
for (const c of R.CONSIGNANTES) {
  const llave = `consig:${slug(c.nombre)}`;
  bloque(
    yaImportado("consignante", llave) +
      `  select id into v_existente from public.consignante where lower(nombre) = lower(${lit(c.nombre)});\n` +
      `  if v_existente is not null then\n    v_id := v_existente;\n` +
      `    insert into public.migracion_registro (lote_id, tabla, registro_id, llave, fila_origen, creado)\n    values ('${LOTE}', 'consignante', v_id, ${lit(llave)}, 'resoluciones F-20', false);\n    return;\n  end if;\n` +
      `  insert into public.consignante (nombre, condiciones_liquidacion)\n  values (${lit(c.nombre)}, ${lit(c.nota)})\n  returning id into v_id;\n` +
      registrar("consignante", llave, "resoluciones F-20")
  );
  bloques.consignante++;
}

/* ── 2. clientes ───────────────────────────────────────────────────────── */
// llaveCliente: cómo el resto del import encuentra a cada cliente.
const clientes = [];
for (const c of clientesCsv) {
  if (R.CLIENTES_UNIFICADOS[c.nombre]) {
    reporte.push(`- Cliente "${c.nombre}" UNIFICADO con "${R.CLIENTES_UNIFICADOS[c.nombre]}" (no se crea).`);
    continue;
  }
  let nombre = c.nombre;
  let telefono = c.telefono || R.TELEFONOS_F01[c.nombre] || null;
  if (nombre === "???") nombre = "Pendiente (Producción R75)";
  clientes.push({
    nombre,
    telefono,
    fila: c._fila_origen,
    nota: [c.notas, c._nota, c._pregunta_pendiente && `Pendiente: ${c._pregunta_pendiente}`]
      .filter(Boolean).join(" | "),
  });
}
for (const n of R.CLIENTES_NUEVOS) clientes.push({ nombre: n.nombre, telefono: null, fila: "resoluciones F-12", nota: n.nota });

const llaveCliente = (cl) => (cl.telefono ? `tel:${cl.telefono}` : `nom:${slug(cl.nombre)}`);
for (const cl of clientes) {
  const llave = llaveCliente(cl);
  let cuerpo = yaImportado("cliente", llave);
  if (cl.telefono) {
    // Dedup contra los clientes que el riel de WhatsApp YA creó en prod:
    // si existe, se enlaza (creado=false) y NO se modifica.
    cuerpo +=
      `  select id into v_existente from public.cliente where telefono = ${lit(cl.telefono)};\n` +
      `  if v_existente is not null then\n    v_id := v_existente;\n` +
      `    insert into public.migracion_registro (lote_id, tabla, registro_id, llave, fila_origen, creado)\n    values ('${LOTE}', 'cliente', v_id, ${lit(llave)}, ${lit(cl.fila)}, false);\n` +
      (cl.nota
        ? `    insert into public.nota_cliente (cliente_id, texto) values (v_id, ${lit("Migración: " + cl.nota)});\n`
        : "") +
      `    return;\n  end if;\n`;
  }
  cuerpo +=
    `  insert into public.cliente (nombre, telefono, estado_pipeline)\n` +
    `  values (${lit(cl.nombre)}, ${lit(cl.telefono)}, 'cerrado')\n  returning id into v_id;\n` +
    registrar("cliente", llave, cl.fila) +
    (cl.nota ? `  insert into public.nota_cliente (cliente_id, texto) values (v_id, ${lit("Migración: " + cl.nota)});\n` : "");
  bloque(cuerpo);
  bloques.cliente++;
}

/* ── 3. items de inventario (+ item_costo solo-admin) ──────────────────── */
const skusUsados = new Map();
let sinSerie = 0;
const itemsGenerados = []; // para el reporte
for (const it of itemsCsv) {
  // F-17: los 4 anillos A10x del libro Inventario son duplicados del maestro.
  if (it._fila_origen.startsWith("Inventario/Anillos/")) {
    reporte.push(`- Item duplicado NO importado (F-17): ${it.descripcion} [${it._fila_origen}]`);
    continue;
  }
  const notas = it.notas || "";
  const cert = (notas.match(/Cert\/Serie:\s*([A-Z0-9]+)/) || [])[1] || null;

  // sku: certificado si hay; si no, ID de caja (A9, Ar01…) desde la descripción.
  let sku = cert;
  if (!sku) {
    const caja = it.descripcion.match(/\b(A\d{1,3}|Ar\d{2,3}|An\d{2}|J\d{1,2}|Ch\d{1,2})\b/);
    sku = caja ? caja[1] : null;
  }
  if (!sku) sku = R.SKU_SIN_SERIE[sinSerie++] ?? `MIG-X${sinSerie}`;
  if (skusUsados.has(sku)) {
    const n = skusUsados.get(sku) + 1;
    skusUsados.set(sku, n);
    sku = `${sku}-${n}`;
  } else skusUsados.set(sku, 1);

  const esConsignacion = it.estado === "consignacion" || /consignaci/i.test(notas) || /Tío Fer|Anillos Jefa|Batch Jefa/.test(it._fila_origen + it.proveedor_o_consignante);
  const esDiamante = /DIAMANTES/.test(notas) || /diamante/i.test(it.descripcion);
  const tipo = it.tipo === "anillo" || it.tipo === "material" ? "pieza_terminada" : esDiamante ? "diamante" : "piedra_color";

  let estado = it.estado === "consignacion" ? "disponible" : it.estado || "disponible";
  let notaExtra = [];
  // F-18: MON EXPO = disponible.
  if (R.MON_EXPO_DISPONIBLE && /MON EXPO/i.test(notas)) { estado = "disponible"; notaExtra.push("En expo (vendible en piso, F-18)"); }
  // F-15: DUDA1 → disponible + pendiente.
  if (/DUDA\s?1/i.test(notas + it.estado)) { estado = "disponible"; notaExtra.push(R.NOTA_DUDA1); }
  if (!["disponible", "reservado", "consumido", "vendido", "devuelto"].includes(estado)) estado = "disponible";
  // F-13: A9 apartado, no vendido.
  if (sku === R.ITEM_A9.skuCaja && /Anillos Jefa/.test(it._fila_origen)) {
    estado = R.ITEM_A9.estado;
    notaExtra.push("F-13: apartado con saldo $18,500 (pedido Producción R45); el 'vendido' de la sheet estaba adelantado");
  }
  // F-16: sin serie.
  if (sku.startsWith("MIG-S")) notaExtra.push(R.NOTA_SIN_SERIE);
  // F-17: montaje del maestro.
  if (cert && R.MONTAJES_A10X[cert]) notaExtra.push(R.MONTAJES_A10X[cert]);

  const consignante = esConsignacion ? R.CONSIGNANTE_BATCH_AR : null;
  const costo = num(it.costo);
  const llave = `item:${it._fila_origen}`;
  const descripcionFull = [notas, it._nota, notaExtra.join(" | ")].filter(Boolean).join(" | ");

  let cuerpo =
    yaImportado("item_inventario", llave) +
    `  insert into public.item_inventario (sku, tipo, nombre, descripcion, quilates, corte, propiedad, consignante_id, estado)\n` +
    `  values (${lit(sku)}, '${tipo}', ${lit(it.descripcion)}, ${lit(descripcionFull)}, ${num(it.quilates) ?? "null"}, ${lit(it.piedra)},\n` +
    `          '${esConsignacion ? "consignacion" : "propio"}',\n` +
    (consignante
      ? `          (select id from public.consignante where lower(nombre) = lower(${lit(consignante)}) limit 1),\n`
      : `          null,\n`) +
    `          '${estado}')\n  returning id into v_id;\n` +
    registrar("item_inventario", llave, it._fila_origen);
  if (costo !== null && costo > 0)
    cuerpo += `  insert into public.item_costo (item_id, costo) values (v_id, ${costo});\n`;
  bloque(cuerpo);
  bloques.item++;
  itemsGenerados.push({ sku, estado, costo });
}
// F-14: las 8 gemas del subset que no están en el maestro.
for (const g of R.GEMAS_SIN_MAESTRO) {
  const llave = `item:gema-sin-maestro:${g.sku}`;
  bloque(
    yaImportado("item_inventario", llave) +
      `  insert into public.item_inventario (sku, tipo, nombre, descripcion, quilates, color, corte, propiedad, estado)\n` +
      `  values (${lit(g.sku)}, 'piedra_color', ${lit(g.nombre)}, ${lit(R.NOTA_GEMAS_SIN_MAESTRO)}, ${g.quilates}, ${lit(g.color)}, ${lit(g.corte)}, 'propio', 'disponible')\n` +
      `  returning id into v_id;\n` +
      registrar("item_inventario", llave, "Inventario/Gemas (subset)")
  );
  bloques.item++;
}

/* ── 4. pedidos (+ cotización con la descripción de la pieza) ──────────── */
// Índice cliente por teléfono y por fila de origen (los 5 sin tel, F-02).
const clientePorTel = new Map(clientes.filter((c) => c.telefono).map((c) => [c.telefono, c]));
const clientePorFila = new Map(clientes.map((c) => [filaN(c.fila), c]));
const pedidos = []; // {llave, clienteLlave, clienteNombre, total, fila, orden}

for (const p of pedidosCsv) {
  let cl = p.telefono_cliente ? clientePorTel.get(p.telefono_cliente) : clientePorFila.get(filaN(p._fila_origen));
  // R50 "Juan PENDIENTE" quedó unificado con Juan Vega:
  if (!cl && filaN(p._fila_origen) === "50")
    cl = clientes.find((c) => c.nombre === "Juan Vega");
  if (!cl) { reporte.push(`- ⚠ PEDIDO SIN CLIENTE (no importado): ${p._fila_origen} ${p.descripcion_pieza}`); continue; }

  const llave = `pedido:${p._fila_origen}`;
  const esA9 = p._fila_origen === R.PEDIDO_A9_FILA;
  const estado = esA9 ? "confirmado" : ["entregado", "en_produccion", "cancelado"].includes(p.estado) ? p.estado : "por_confirmar";
  const fechaComp = fechaISO(p.fecha_entrega_prometida);
  const total = num(p.precio_total) ?? 0;
  const notasCot = [
    `Migración ${p._fila_origen}`,
    p.notas,
    p.talla && `Talla ${p.talla}`,
    p.piedra && `Piedra: ${p.piedra}`,
    !fechaComp && p.fecha_entrega_prometida && `Fecha entrega (texto original): ${p.fecha_entrega_prometida}`,
    p._nota,
  ].filter(Boolean).join(" | ");
  const metal = /oro/i.test(p.metal) ? "oro" : /platino/i.test(p.metal) ? "platino" : /plata/i.test(p.metal) ? "plata" : null;

  bloque(
    yaImportado("pedido", llave) +
      `  select registro_id into v_existente from public.migracion_registro where tabla = 'cliente' and llave = ${lit(llaveCliente(cl))};\n` +
      `  if v_existente is null then raise exception 'cliente no encontrado para ${esc(llave)}'; end if;\n` +
      `  insert into public.pedido (cliente_id, linea_negocio, estado, total, fecha_compromiso)\n` +
      `  values (v_existente, 'bridal', '${estado}', ${total}, ${lit(fechaComp)})\n  returning id into v_id;\n` +
      registrar("pedido", llave, p._fila_origen) +
      `  declare v_cot uuid;\n  begin\n` +
      `    insert into public.cotizacion (cliente_id, estado, total, notas, pedido_id)\n` +
      `    values (v_existente, 'aceptada', ${total}, ${lit(notasCot)}, v_id)\n    returning id into v_cot;\n` +
      `    insert into public.migracion_registro (lote_id, tabla, registro_id, llave, fila_origen, creado)\n    values ('${LOTE}', 'cotizacion', v_cot, ${lit("cot:" + p._fila_origen)}, ${lit(p._fila_origen)}, true);\n` +
      `    insert into public.cotizacion_linea (cotizacion_id, descripcion, metal, quilataje, precio)\n` +
      `    values (v_cot, ${lit(p.descripcion_pieza + (p.talla ? ` (talla ${p.talla})` : ""))}, ${metal ? `'${metal}'` : "null"}, ${lit(p.metal)}, ${total});\n` +
      `    update public.pedido set cotizacion_id = v_cot where id = v_id;\n  end;\n`
  );
  bloques.pedido++;
  pedidos.push({ llave, clienteLlave: llaveCliente(cl), clienteNombre: cl.nombre, total, fila: p._fila_origen, orden: parseInt(filaN(p._fila_origen)) });
}

/* ── 5. pagos + movimientos del ledger ─────────────────────────────────── */
// Macheo de ingresos → cliente (mismo algoritmo del pre-macheo + resoluciones).
const STOP = new Set("anticipo liquidacion ingreso abono transf tarjeta efectivo mercado pago venta anillo argolla argollas de la el del expo piedra piedras zafiro".split(" "));
const idxClientes = clientes.map((c) => ({ c, toks: norm(c.nombre).split(/\s+/).filter(Boolean) }));
function machearCliente(concepto) {
  const toks = norm(concepto).split(/\s+/).filter((t) => t.length > 2 && !STOP.has(t));
  let hits = [];
  for (const { c, toks: nt } of idxClientes) {
    const score = toks.filter((t) => nt.includes(t)).length;
    if (score) hits.push({ score, largo: nt.length, c });
  }
  if (!hits.length) return null;
  hits.sort((a, b) => b.score - a.score || a.largo - b.largo);
  const empates = hits.filter((h) => h.score === hits[0].score);
  return empates.length === 1 ? hits[0].c : null; // ambiguo → null
}

const metodoSQL = (m) => (["efectivo", "transferencia", "tarjeta"].includes(m) ? m : "otro");
const asignadoPorPedido = new Map(pedidos.map((p) => [p.llave, 0]));
const pagosPorPedido = new Map(pedidos.map((p) => [p.llave, 0]));
const pagosGenerados = [];
const pools = R.REPARTO_POR_CUADRE.map((r) => ({ ...r, movs: [] }));

function asignarPago(cliente, monto, fecha, metodo, concepto, filaOrigen) {
  // llena los pedidos del cliente (por orden de fila) hasta su precio
  let restante = monto;
  const propios = pedidos.filter((p) => p.clienteNombre === cliente).sort((a, b) => a.orden - b.orden);
  let n = 0;
  for (const p of propios) {
    if (restante <= 0) break;
    const capacidad = p.total - asignadoPorPedido.get(p.llave);
    if (capacidad <= 0) continue;
    const aplica = Math.min(capacidad, restante);
    asignadoPorPedido.set(p.llave, asignadoPorPedido.get(p.llave) + aplica);
    restante = Math.round((restante - aplica) * 100) / 100;
    const liquidacion = asignadoPorPedido.get(p.llave) >= p.total;
    const primero = pagosPorPedido.get(p.llave) === 0;
    pagosPorPedido.set(p.llave, pagosPorPedido.get(p.llave) + 1);
    const tipo = liquidacion ? "liquidacion" : primero ? "anticipo_1" : "parcialidad";
    const llavePago = `pago:${filaOrigen}#${++n > 1 ? n : p.llave.slice(7)}`;
    bloque(
      yaImportado("pago", llavePago) +
        `  select registro_id into v_existente from public.migracion_registro where tabla = 'pedido' and llave = ${lit(p.llave)};\n` +
        `  if v_existente is null then raise exception 'pedido no encontrado para ${esc(llavePago)}'; end if;\n` +
        `  insert into public.pago (pedido_id, monto, fecha, metodo, tipo, notas)\n` +
        `  values (v_existente, ${aplica}, ${lit(fecha)}, '${metodoSQL(metodo)}', '${tipo}', ${lit("Migración: " + concepto)})\n  returning id into v_id;\n` +
        registrar("pago", llavePago, filaOrigen)
    );
    bloques.pago++;
    pagosGenerados.push({ cliente, pedido: p.fila, monto: aplica, fecha, concepto });
  }
  return restante; // lo que no cupo en ningún pedido
}

// Recorre el ledger completo (902) y decide categoría + liga.
const totalesLedger = {};
let transferencias = 0, transferenciasSuma = 0;
const ingresosSinLigar = [];

for (const m of movsCsv) {
  const fecha = fechaISO(m.fecha);
  if (!fecha) { reporte.push(`- ⚠ MOVIMIENTO SIN FECHA PARSEABLE (no importado): ${m._fila_origen} "${m.fecha}"`); continue; }
  const monto = num(m.monto);
  if (monto === null || monto < 0) { reporte.push(`- ⚠ MOVIMIENTO CON MONTO INVÁLIDO (no importado): ${m._fila_origen} "${m.monto}"`); continue; }

  let categoria = { Ingreso: "ingreso", Gasto: "gasto", Costo: "costo", Deuda: "deuda", "Pago Deuda": "pago_deuda", Capital: "capital" }[m.categoria] || m.tipo;
  let concepto = m.concepto;
  if (m.relacionado_con) concepto += ` (Fuente: ${m.relacionado_con})`;

  let clienteLigado = null;
  if (categoria === "ingreso") {
    if (R.REGEX_TRANSFERENCIA_INTERNA.test(m.concepto)) {
      categoria = "transferencia_interna";
      transferencias++; transferenciasSuma += monto;
    } else {
      // pools de reparto por cuadre (Jonathan / Juan)
      const pool = pools.find((p) => p.conceptoRegex.test(m.concepto));
      if (pool) { pool.movs.push({ ...m, fecha, monto }); }
      else if (Object.prototype.hasOwnProperty.call(R.LIGA_MANUAL, m.concepto)) {
        clienteLigado = R.LIGA_MANUAL[m.concepto];
      } else {
        const c = machearCliente(m.concepto);
        clienteLigado = c ? c.nombre : null;
      }
      if (!pools.find((p) => p.conceptoRegex.test(m.concepto))) {
        if (clienteLigado) {
          const sobrante = asignarPago(clienteLigado, monto, fecha, m.metodo, m.concepto, m._fila_origen);
          if (sobrante > 0)
            reporte.push(`- ⚠ Pago de ${clienteLigado} con sobrante $${sobrante.toLocaleString()} sin pedido con capacidad (${m._fila_origen} "${m.concepto}")`);
        } else ingresosSinLigar.push(`$${monto.toLocaleString()} ${fecha} "${m.concepto}"`);
      }
    }
  }

  const llave = `mov:${m._fila_origen}`;
  bloque(
    yaImportado("movimiento_financiero", llave) +
      `  insert into public.movimiento_financiero (fecha, categoria, concepto, monto, origen)\n` +
      `  values (${lit(fecha)}, '${categoria}', ${lit(concepto)}, ${monto}, 'migracion')\n  returning id into v_id;\n` +
      registrar("movimiento_financiero", llave, m._fila_origen)
  );
  bloques.movimiento++;
  totalesLedger[categoria] = Math.round(((totalesLedger[categoria] ?? 0) + monto) * 100) / 100;
}

// Reparto por cuadre de los pools (cronológico).
for (const pool of pools) {
  pool.movs.sort((a, b) => a.fecha.localeCompare(b.fecha));
  for (const m of pool.movs) {
    let restante = m.monto;
    for (const nombre of pool.clientes) {
      if (restante <= 0) break;
      restante = asignarPago(nombre, restante, m.fecha, m.metodo, m.concepto, m._fila_origen);
    }
    if (restante > 0)
      reporte.push(`- ⚠ Pool "${pool.etiqueta}": $${restante.toLocaleString()} de "${m.concepto}" (${m.fecha}) sin pedido con capacidad — queda solo en el ledger`);
  }
}

// Verificación de la resolución de transferencias internas.
if (transferencias !== R.TOTAL_TRANSFERENCIAS.filas)
  throw new Error(`transferencias internas: esperaba ${R.TOTAL_TRANSFERENCIAS.filas}, detecté ${transferencias}`);

/* ── 6. expos ──────────────────────────────────────────────────────────── */
for (const e of exposCsv) {
  const llave = `expo:${e._fila_origen}`;
  const estado = /confirmado/.test(e.estado) ? "contratada" : /ya_paso/.test(e.estado) ? "cancelada" : "candidata";
  // "15-16 ago 2026 (confirmado)" → inicio/fin
  let ini = null, fin = null;
  const rango = e.fecha.match(/(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s+([a-zá-ú]+)\.?\s+(\d{4})/i);
  if (rango) {
    const mes = MESES[norm(rango[3]).slice(0, 3)];
    if (mes) {
      ini = `${rango[4]}-${String(mes).padStart(2, "0")}-${String(rango[1]).padStart(2, "0")}`;
      fin = rango[2] ? `${rango[4]}-${String(mes).padStart(2, "0")}-${String(rango[2]).padStart(2, "0")}` : ini;
    }
  }
  const notas = [`Migración ${e._fila_origen}`, `Fecha original: ${e.fecha}`, e._nota].filter(Boolean).join(" | ");
  bloque(
    yaImportado("expo", llave) +
      `  insert into public.expo (nombre, ciudad, fecha_inicio, fecha_fin, estado, notas)\n` +
      `  values (${lit(e.nombre_expo)}, ${lit(e.ciudad)}, ${lit(ini)}, ${lit(fin)}, '${estado}', ${lit(notas)})\n  returning id into v_id;\n` +
      registrar("expo", llave, e._fila_origen)
  );
  bloques.expo++;
}

/* ── ensamblado final ──────────────────────────────────────────────────── */
const cabecera = `-- IMPORT DE LAS SHEETS — generado por scripts/migracion/generar-import.mjs
-- Lote: ${LOTE}
-- Idempotente (re-correr no duplica) y reversible:
--   select * from public.revertir_lote_migracion('${LOTE}');
-- Requiere la migración 0038 aplicada. Corre TODO o nada (una transacción).

begin;

insert into public.migracion_lote (id, nombre, notas)
values ('${LOTE}', 'sheets-2026-07', 'Import de las 4 sheets + expos (docs/migracion). Generado ${new Date().toISOString().slice(0, 10)}')
on conflict (id) do nothing;

-- Histórico NO dispara eventos §4: el ledger viene completo de Contabilidad,
-- así que el asiento automático por pago duplicaría ingresos.
alter table public.pago disable trigger trg_pago_asiento;
`;
const pie = `
alter table public.pago enable trigger trg_pago_asiento;

commit;

-- ── Verificación (correr después del import) ─────────────────────────────
-- Sumas del ledger por categoría (deben cuadrar con las cifras de control):
select categoria, count(*) as filas, sum(monto) as total
  from public.movimiento_financiero where origen = 'migracion'
 group by categoria order by categoria;
-- Suma de pedidos importados (control: 1,825,270):
select count(*) as pedidos, sum(total) as suma_precios from public.pedido p
 where exists (select 1 from public.migracion_registro r where r.tabla = 'pedido' and r.registro_id = p.id);
-- Conteos por tabla del lote:
select tabla, count(*) filas, count(*) filter (where creado) creados
  from public.migracion_registro where lote_id = '${LOTE}' group by tabla order by tabla;
`;
writeFileSync(join(OUT, "import_sheets.sql"), cabecera + "\n" + sql.join("\n\n") + "\n" + pie);

/* ── reporte ───────────────────────────────────────────────────────────── */
const esperado = {
  ingreso: 2257368.24 - transferenciasSuma,
  transferencia_interna: transferenciasSuma,
};
const rep = `# Reporte de generación del import — lote ${LOTE}

## Bloques generados
${Object.entries(bloques).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

## Ledger generado por categoría (lo que el dry-run debe reproducir)
${Object.entries(totalesLedger).map(([k, v]) => `- ${k}: $${v.toLocaleString()}`).join("\n")}
(Control del paquete: Ingreso $2,257,368 se divide en ingreso $${esperado.ingreso.toLocaleString()} + transferencia_interna $${Math.round(transferenciasSuma).toLocaleString()}; Gasto+Costo $6,173,822; Deuda $4,289,840; Pago Deuda $445,271.)

## Pagos ligados a pedidos: ${pagosGenerados.length}
${pagosGenerados.map((p) => `- ${p.cliente} ← $${p.monto.toLocaleString()} (${p.fecha}) "${p.concepto}" → pedido ${p.pedido}`).join("\n")}

## Ingresos SIN ligar a cliente (entran solo al ledger): ${ingresosSinLigar.length}
${ingresosSinLigar.map((s) => `- ${s}`).join("\n")}

## Notas y advertencias
${reporte.join("\n") || "- (ninguna)"}
`;
writeFileSync(join(OUT, "reporte.md"), rep);

console.log(`Lote ${LOTE}`);
console.log(Object.entries(bloques).map(([k, v]) => `${k}=${v}`).join(" "));
console.log(`transferencias internas: ${transferencias} ($${Math.round(transferenciasSuma).toLocaleString()})`);
console.log(`pagos ligados: ${pagosGenerados.length} | ingresos sin ligar: ${ingresosSinLigar.length}`);
console.log(`SQL: scripts/migracion/out/import_sheets.sql | Reporte: scripts/migracion/out/reporte.md`);
