import type { ContactoUtil } from "@/lib/contactos-utiles";

/* DATOS DE MUESTRA — solo modo local (sin Supabase); en producción nunca se usan. */
const S = "00000000-0000-0000-0000-000000000001";

export const CONTACTOS_UTILES_MUESTRA: ContactoUtil[] = [
  {
    id: "60000000-0000-0000-0000-000000000001",
    nombre: "Don Chuy",
    tipo: "vaciador",
    contacto: "8111112233",
    especialidad: "Vaciado en oro 14k/18k; maneja platino",
    tiempo_entrega: "3-5 días hábiles",
    precios_estimados: "$600-900 por pieza chica",
    notas: "El de confianza para urgencias; avisar con un día.",
    sucursal_id: S,
    created_at: "2026-07-01T18:00:00Z",
    updated_at: "2026-07-01T18:00:00Z",
  },
  {
    id: "60000000-0000-0000-0000-000000000002",
    nombre: "Taller Márquez",
    tipo: "montador",
    contacto: "montajes@marquez.mx",
    especialidad: "Montado de piedra central y pavé fino",
    tiempo_entrega: "1 semana",
    precios_estimados: "$1,200-2,000 según piedra",
    notas: null,
    sucursal_id: S,
    created_at: "2026-07-03T18:00:00Z",
    updated_at: "2026-07-03T18:00:00Z",
  },
  {
    id: "60000000-0000-0000-0000-000000000003",
    nombre: "Maestro Elías",
    tipo: "joyero",
    contacto: "8199887766",
    especialidad: "Hechura completa a mano, reparaciones complejas",
    tiempo_entrega: null,
    precios_estimados: null,
    notas: "Recomendado por el proveedor de monturas.",
    sucursal_id: S,
    created_at: "2026-07-05T18:00:00Z",
    updated_at: "2026-07-05T18:00:00Z",
  },
];
