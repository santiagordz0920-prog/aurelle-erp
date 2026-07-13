/*
  Resoluciones de la conciliación (docs/migracion/CONCILIACION.md y PREMACHEO.md,
  sesión interactiva con Santiago 2026-07-13). El generador NO decide nada:
  todo criterio vive aquí, revisable.
*/

// F-01: teléfono de Victor (único que Santiago tenía).
export const TELEFONOS_F01 = { Victor: "8111921770" };

// F-12/PREMACHEO: "un solo Juan" — el cliente "Juan PENDIENTE" (pedido R50) se
// unifica con Juan Vega; no se crea como cliente aparte.
export const CLIENTES_UNIFICADOS = { "Juan PENDIENTE": "Juan Vega" };

// Cliente histórico nuevo (liquidación en Contabilidad, sin pedido en las sheets).
export const CLIENTES_NUEVOS = [
  {
    nombre: "José Sandoval",
    nota: "Migración: liquidación $35,000 (22-jul-2025, Contabilidad). Su pedido no se registró en las sheets de Producción (confirmado por Santiago, F-12).",
  },
];

// Movimientos "Ingreso" que son transferencias internas (cash↔cuenta) → tipo
// transferencia_interna, fuera del P&L. Debe casar EXACTAMENTE 29 filas.
export const REGEX_TRANSFERENCIA_INTERNA =
  /conversi|transf.*cash|cash a cuenta|cuenta a cash|rendimiento|deuda.*cash|a klar|cash a renta|transferencia santiago/i;
export const TOTAL_TRANSFERENCIAS = { filas: 29, suma: 388051.14 };

// Ingresos ligados a mano (override del macheo automático). Por texto exacto
// del concepto → nombre del cliente destino (null = NO ligar a cliente).
export const LIGA_MANUAL = {
  "Ingreso Sara Anticipo zafiro y rubi argollas señor de los anillos": "Sara",
  "Mauricio Liquidación": "Mauricio Treviño Ñañez",
  "Luna Anticipo": "Luna Hermano",
  "Liquidación Luna": "Luna Hermano",
  "Liquidacion José Sandoval": "José Sandoval",
  // Financiamiento familiar: no son pagos de cliente (quedan solo en el ledger).
  "Ingreso piedra papá fer": null,
  "Gasto Pago deuda Fer": null,
  "Conversión a cash  Fer y Papá Fer": null,
  "Ingreso Jefe Fer Al precio": null,
  // Pendientes de Fer: quedan sin ligar explícitamente.
  "Jorge Flores Liquidacion": null,
  "Liquidacion Jorge": null,
  "Liquidación Gerardo": null,
  "Ingreso Marcos Reyes Anticipo anillo oval": null,
  "Ingreso Marcos Reyes Liquidación": null,
};

// Reparto por cuadre (regla aprobada por Santiago): estos conceptos forman un
// pool que se asigna cronológicamente a los pedidos de los clientes listados,
// llenando cada pedido hasta su precio.
export const REPARTO_POR_CUADRE = [
  {
    etiqueta: "Jonathan",
    conceptoRegex: /jonathan/i,
    clientes: ["Jonathan Guillermo Sanmiguel", "Jonathan González González"],
  },
  {
    etiqueta: "Juan",
    conceptoRegex: /\bjuan\b/i,
    clientes: ["Juan Vega"],
  },
];

// F-13: el anillo A9 está APARTADO (no vendido): saldo vivo $18,500.
export const ITEM_A9 = { skuCaja: "A9", estado: "reservado" };
// El pedido del A9 (Producción R45) entra como confirmado (apartado).
export const PEDIDO_A9_FILA = "Operaciones v1/Producción/R45";

// F-18: MON EXPO = disponible (en piso), no reservada.
export const MON_EXPO_DISPONIBLE = true;

// F-17: los 4 "Anillo terminado A10x" NO se importan (duplicado del maestro);
// su info de montaje se anexa como nota a la pieza del maestro por certificado.
export const MONTAJES_A10X = {
  LG669476537: "Montada en anillo terminado A104 (oro 14k blanco, solitario Princess; precio venta 45k)",
  LG687552383: "Montada en anillo terminado A101 (oro 14k blanco, pavé Emerald; precio venta 40k)",
  LG689570766: "Montada en anillo terminado A103 (oro 14k blanco, solitario Round; precio venta 35k)",
  LG669424552: "Montada en anillo terminado A106 (oro 14k blanco, pavé Princess; precio venta 40k)",
};

// F-14: las 8 gemas del subset Inventario/Gemas que NO están en el maestro.
// Santiago: "piezas reales probablemente" → alta sin costo (pendiente).
export const GEMAS_SIN_MAESTRO = [
  { sku: "MIG-G1", nombre: "Zafiro Royal Blue Emerald 2.00ct", quilates: 2.0, corte: "Emerald", color: "Royal Blue" },
  { sku: "MIG-G2", nombre: "Zafiro Royal Blue Round 2.20ct", quilates: 2.2, corte: "Round", color: "Royal Blue" },
  { sku: "MIG-G3", nombre: "Zafiro Royal Blue Cushion 2.20ct", quilates: 2.2, corte: "Cushion", color: "Royal Blue" },
  { sku: "MIG-G4", nombre: "Zafiro Royal Blue Pear 2.20ct", quilates: 2.2, corte: "Pear", color: "Royal Blue" },
  { sku: "MIG-G5", nombre: "Zafiro Royal Blue Princess 2.20ct", quilates: 2.2, corte: "Princess", color: "Royal Blue" },
  { sku: "MIG-G6", nombre: "Zafiro Royal Blue Heart 2.40ct", quilates: 2.4, corte: "Heart", color: "Royal Blue" },
  { sku: "MIG-G7", nombre: "Esmeralda Muzo/Intense green 5.17ct (1 de 2 faltantes)", quilates: 5.17, corte: "Esmeralda", color: "Green" },
  { sku: "MIG-G8", nombre: "Esmeralda Muzo/Intense green 5.17ct (2 de 2 faltantes)", quilates: 5.17, corte: "Esmeralda", color: "Green" },
];
export const NOTA_GEMAS_SIN_MAESTRO =
  "Migración F-14: estaba en Inventario/Gemas pero no en el maestro; costo pendiente (Fer).";

// F-20/F-20b/F-22: catálogo real de proveedores y consignante.
export const CONSIGNANTES = [
  {
    nombre: "La Jefa (mamá de Fer)",
    nota: "Nombre y contacto reales pendientes (F-20, Fer). Consigna los anillos A1–A27 y el batch Ar01–Ar126 ('Precio total Tio Fer' = lo que se le devuelve al venderse, F-20b).",
  },
];
export const PROVEEDORES = [
  { nombre: "Agustín", categorias: ["maquila", "joyería"], notas: "Joyero / maquila (contacto pendiente)." },
  { nombre: "Chino", categorias: ["diseño", "render CAD"], notas: "Diseño / render CAD (contacto pendiente)." },
  { nombre: "Forte", categorias: ["empaque"], notas: "Cajas de producto (corregido en conciliación: NO es proveedor de diamantes)." },
  { nombre: "Wholesaler", categorias: ["diamantes", "churumbelas"], notas: "Surte diamantes y churumbelas pedibles (F-22)." },
];
// El consignante al que apuntan los items cuyo CSV dice "Tío Fer (joyería local)".
export const CONSIGNANTE_BATCH_AR = "La Jefa (mamá de Fer)";

// F-15: piezas en DUDA1 → entran disponibles con nota de pendiente.
export const NOTA_DUDA1 = "Migración F-15: estado 'DUDA1' en la sheet; estado real pendiente (Fer).";

// F-16: piezas del maestro sin número de serie → sku temporal.
export const SKU_SIN_SERIE = ["MIG-S1", "MIG-S2"];
export const NOTA_SIN_SERIE = "Migración F-16: sin número de serie en la sheet; ID definitivo pendiente (Fer).";
