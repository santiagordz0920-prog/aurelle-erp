import type { Proveedor } from "@/lib/proveedores";

/* Datos de muestra — solo modo local. NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";

export const PROVEEDORES_MUESTRA: Proveedor[] = [
  {
    id: "c2000000-0000-0000-0000-000000000001",
    nombre: "Metales del Norte",
    contacto: "ventas@metalesnorte.mx · 81 1234 5678",
    categorias: ["metales"],
    condiciones_pago: "Contado",
    notas: "Oro 14k/18k y platino. Entrega en 2 días.",
    sucursal_id: S,
    created_at: "2026-06-15T18:00:00Z",
    updated_at: "2026-06-15T18:00:00Z",
  },
  {
    id: "c2000000-0000-0000-0000-000000000002",
    nombre: "Casting MTY",
    contacto: "taller@castingmty.mx",
    categorias: ["casting", "engaste"],
    condiciones_pago: "30 días",
    notas: null,
    sucursal_id: S,
    created_at: "2026-06-20T18:00:00Z",
    updated_at: "2026-06-20T18:00:00Z",
  },
];
