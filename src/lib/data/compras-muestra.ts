import type { Compra } from "@/lib/compras";

/* Datos de muestra — solo modo local. NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";

function haceDias(d: number): string {
  const f = new Date();
  f.setDate(f.getDate() - d);
  return f.toISOString().slice(0, 10);
}

export const COMPRAS_MUESTRA: Compra[] = [
  {
    id: "c3000000-0000-0000-0000-000000000001",
    proveedor_id: "c2000000-0000-0000-0000-000000000002",
    proveedor_nombre: "Casting MTY",
    fecha: haceDias(4),
    concepto: "Casting de 3 monturas",
    tipo: "inventario",
    condicion_pago: "credito",
    monto: 9000,
    fecha_vencimiento: haceDias(-26),
    notas: null,
    sucursal_id: S,
    created_at: haceDias(4),
    updated_at: haceDias(4),
  },
  {
    id: "c3000000-0000-0000-0000-000000000002",
    proveedor_id: "c2000000-0000-0000-0000-000000000001",
    proveedor_nombre: "Metales del Norte",
    fecha: haceDias(2),
    concepto: "Oro 18k — 30g",
    tipo: "inventario",
    condicion_pago: "contado",
    monto: 49500,
    fecha_vencimiento: null,
    notas: "Para pedido de Ana.",
    sucursal_id: S,
    created_at: haceDias(2),
    updated_at: haceDias(2),
  },
];
