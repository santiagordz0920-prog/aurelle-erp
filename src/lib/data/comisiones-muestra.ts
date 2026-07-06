import type { Comision } from "@/lib/comisiones";

/* Datos de muestra — solo modo local. NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";

export const COMISIONES_MUESTRA: Comision[] = [
  {
    id: "d2000000-0000-0000-0000-000000000001",
    pedido_id: "f2000000-0000-0000-0000-000000000003", // pedido entregado de muestra
    pedido_cliente: "Ana López",
    beneficiario: "Planner Bodas MTY",
    tipo: "planner",
    porcentaje: 10,
    monto: 2100, // 10% de la utilidad (60000 − 39000 = 21000)
    estado: "devengada",
    pagada_at: null,
    sucursal_id: S,
    created_at: "2026-06-28T20:30:00Z",
    updated_at: "2026-06-28T20:30:00Z",
  },
];
