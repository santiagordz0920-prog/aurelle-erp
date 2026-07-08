import type { CostoProduccion, OrdenProduccion } from "@/lib/produccion";

/* Datos de muestra — solo modo local. NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";
const FER = "00000000-0000-0000-0000-0000000000bb";

function haceDias(d: number): string {
  return new Date(Date.now() - d * 86400000).toISOString();
}

export const COSTOS_PROD_MUESTRA: CostoProduccion[] = [
  {
    id: "cp100000-0000-0000-0000-000000000001",
    orden_id: "op100000-0000-0000-0000-000000000001",
    tipo: "casting",
    concepto: "Casting montura solitario",
    monto: 8000,
    registrado_por: FER,
    created_at: haceDias(2),
  },
  {
    id: "cp100000-0000-0000-0000-000000000002",
    orden_id: "op100000-0000-0000-0000-000000000001",
    tipo: "material",
    concepto: "Oro adicional",
    monto: 3500,
    registrado_por: FER,
    created_at: haceDias(1),
  },
];

export const ORDENES_MUESTRA: OrdenProduccion[] = [
  {
    id: "op100000-0000-0000-0000-000000000001",
    pedido_id: "f2000000-0000-0000-0000-000000000001",
    pedido_cliente: "Ana López",
    linea_negocio: "bridal",
    etapa: "casting",
    responsable_id: FER,
    responsable_nombre: "Fer",
    fecha_compromiso: "2026-07-12",
    qc_ok: false,
    notas: "Diamante ovalado 2.2ct ya asignado.",
    sucursal_id: S,
    created_at: haceDias(4),
    updated_at: haceDias(1),
  },
  {
    id: "op100000-0000-0000-0000-000000000002",
    pedido_id: "f2000000-0000-0000-0000-000000000002",
    pedido_cliente: "Carla Mendoza",
    linea_negocio: "concierge",
    etapa: "diseno",
    responsable_id: null,
    responsable_nombre: null,
    fecha_compromiso: "2026-07-30",
    qc_ok: false,
    notas: null,
    sucursal_id: S,
    created_at: haceDias(10),
    updated_at: haceDias(9),
  },
];
