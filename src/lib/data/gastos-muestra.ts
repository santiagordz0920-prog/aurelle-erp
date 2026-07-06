import type { GastoRecurrente } from "@/lib/gastos";

/* Datos de muestra — solo modo local. NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";

export const GASTOS_MUESTRA: GastoRecurrente[] = [
  {
    id: "e2000000-0000-0000-0000-000000000001",
    concepto: "Renta showroom Ellion",
    monto: 45000,
    categoria: "renta",
    periodicidad: "mensual",
    dia_cargo: 1,
    activo: true,
    ultimo_posteo: null,
    sucursal_id: S,
    created_at: "2026-06-01T16:00:00Z",
    updated_at: "2026-06-01T16:00:00Z",
  },
  {
    id: "e2000000-0000-0000-0000-000000000002",
    concepto: "Suscripción diseño CAD",
    monto: 1200,
    categoria: "suscripción",
    periodicidad: "mensual",
    dia_cargo: 5,
    activo: true,
    ultimo_posteo: null,
    sucursal_id: S,
    created_at: "2026-06-01T16:00:00Z",
    updated_at: "2026-06-01T16:00:00Z",
  },
  {
    id: "e2000000-0000-0000-0000-000000000003",
    concepto: "Internet + luz",
    monto: 3800,
    categoria: "servicio",
    periodicidad: "mensual",
    dia_cargo: 10,
    activo: true,
    ultimo_posteo: null,
    sucursal_id: S,
    created_at: "2026-06-01T16:00:00Z",
    updated_at: "2026-06-01T16:00:00Z",
  },
];
