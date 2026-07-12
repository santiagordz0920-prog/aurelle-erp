import type { ContactoUtil } from "@/lib/contactos-utiles";

/* Datos de muestra — solo modo local. NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";

export const CONTACTOS_UTILES_MUESTRA: ContactoUtil[] = [
  {
    id: "c3000000-0000-0000-0000-000000000001",
    nombre: "Don Raúl (Taller Centro)",
    tipo: "joyero",
    contacto: "81 8345 1122",
    especialidad: "Reparaciones finas y ajuste de talla en oro",
    tiempo_entrega: "2-3 días",
    precio_estimado: "$400-900 por ajuste",
    notas: "Solo efectivo. Recoge y entrega en su local.",
    sucursal_id: S,
    created_at: "2026-07-01T18:00:00Z",
    updated_at: "2026-07-01T18:00:00Z",
  },
  {
    id: "c3000000-0000-0000-0000-000000000002",
    nombre: "Vaciados Regio",
    tipo: "vaciador",
    contacto: "vaciadosregio@gmail.com · 81 2210 4455",
    especialidad: "Cera perdida en oro 14k/18k y plata",
    tiempo_entrega: "4-6 días hábiles",
    precio_estimado: "Por gramo + $350 de árbol",
    notas: null,
    sucursal_id: S,
    created_at: "2026-07-02T18:00:00Z",
    updated_at: "2026-07-02T18:00:00Z",
  },
  {
    id: "c3000000-0000-0000-0000-000000000003",
    nombre: "Chuy Montajes",
    tipo: "montador",
    contacto: "81 9988 7766 (WhatsApp)",
    especialidad: "Micropavé y engaste de centro en halo",
    tiempo_entrega: null,
    precio_estimado: null,
    notas: "Recomendado por el proveedor de casting.",
    sucursal_id: S,
    created_at: "2026-07-03T18:00:00Z",
    updated_at: "2026-07-03T18:00:00Z",
  },
];
