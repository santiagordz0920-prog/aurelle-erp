import type { CuentaPorPagar, MovimientoFinanciero } from "@/lib/finanzas";

/* Datos de muestra — solo modo local. NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";

function fecha(dia: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dia);
  return d.toISOString().slice(0, 10);
}

export const MOVIMIENTOS_MUESTRA: MovimientoFinanciero[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    fecha: fecha(1),
    categoria: "ingreso",
    concepto: "Pago: anticipo_2",
    monto: 45000,
    linea_negocio: "bridal",
    pedido_id: "f2000000-0000-0000-0000-000000000001",
    pago_id: "pg-2",
    origen: "pago",
    folio_factura: null,
    registrado_por: null,
    sucursal_id: S,
    created_at: fecha(1),
    updated_at: fecha(1),
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    fecha: fecha(2),
    categoria: "ingreso",
    concepto: "Pago: anticipo_1",
    monto: 1000,
    linea_negocio: "concierge",
    pedido_id: "f2000000-0000-0000-0000-000000000002",
    pago_id: "pg-3",
    origen: "pago",
    folio_factura: null,
    registrado_por: null,
    sucursal_id: S,
    created_at: fecha(2),
    updated_at: fecha(2),
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    fecha: fecha(3),
    categoria: "costo",
    concepto: "Casting externo — pedido Ana",
    monto: 8000,
    linea_negocio: "bridal",
    pedido_id: "f2000000-0000-0000-0000-000000000001",
    pago_id: null,
    origen: "compra",
    folio_factura: null,
    registrado_por: null,
    sucursal_id: S,
    created_at: fecha(3),
    updated_at: fecha(3),
  },
  {
    id: "a0000000-0000-0000-0000-000000000004",
    fecha: fecha(6),
    categoria: "gasto",
    concepto: "Renta Ellion (julio)",
    monto: 35000,
    linea_negocio: null,
    pedido_id: null,
    pago_id: null,
    origen: "gasto",
    folio_factura: null,
    registrado_por: null,
    sucursal_id: S,
    created_at: fecha(6),
    updated_at: fecha(6),
  },
];

export const CXP_MUESTRA: CuentaPorPagar[] = [
  {
    id: "b0000000-0000-0000-0000-000000000001",
    consignante_id: "c1",
    consignante_nombre: "Consignante A1",
    item_id: "e1000000-0000-0000-0000-000000000002",
    pedido_id: "f2000000-0000-0000-0000-000000000001",
    concepto: "Consignación reservada: MON-014",
    monto: 12000,
    estado: "pendiente",
    fecha_vencimiento: null,
    pagada_at: null,
    sucursal_id: S,
    created_at: fecha(1),
    updated_at: fecha(1),
  },
];
