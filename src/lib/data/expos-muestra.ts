import type { Expo } from "@/lib/expos";

/* Datos de muestra — solo modo local. NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";

export const EXPOS_MUESTRA: Expo[] = [
  {
    id: "e5000000-0000-0000-0000-000000000001",
    nombre: "Expo Novias Monterrey",
    ciudad: "Monterrey",
    fecha_inicio: "2026-08-15",
    fecha_fin: "2026-08-17",
    estado: "contratada",
    costo: 45000,
    contacto: "Laura (organizadora) · 8112223344",
    notas: "Stand esquina, alto tráfico.",
    sucursal_id: S,
  },
  {
    id: "e5000000-0000-0000-0000-000000000002",
    nombre: "Wedding Fair CDMX",
    ciudad: "CDMX",
    fecha_inicio: "2026-05-10",
    fecha_fin: "2026-05-11",
    estado: "ejecutada",
    costo: 80000,
    contacto: null,
    notas: null,
    sucursal_id: S,
  },
];
