import type { Cita } from "@/lib/citas";

/* Datos de muestra — solo modo local. NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";

function hoyA(hora: number, min = 0, dias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, min, 0, 0);
  return d.toISOString();
}

export const CITAS_MUESTRA: Cita[] = [
  {
    id: "c4000000-0000-0000-0000-000000000001",
    cliente_id: "10000000-0000-0000-0000-000000000001",
    cliente_nombre: "Ana López",
    tipo: "cierre",
    sala: "closing_room",
    inicio: hoyA(17, 0, 0),
    duracion_min: 90,
    estado: "confirmada",
    resultado: null,
    pedido_id: null,
    notas: "Trae a la pareja. Revisar render final.",
    creada_por: null,
    sucursal_id: S,
    created_at: hoyA(9, 0, -2),
    updated_at: hoyA(9, 0, -2),
  },
  {
    id: "c4000000-0000-0000-0000-000000000002",
    cliente_id: "10000000-0000-0000-0000-000000000003",
    cliente_nombre: "Carla Mendoza",
    tipo: "primera_visita",
    sala: "piso_ventas",
    inicio: hoyA(12, 30, 1),
    duracion_min: 60,
    estado: "agendada",
    resultado: null,
    pedido_id: null,
    notas: null,
    creada_por: null,
    sucursal_id: S,
    created_at: hoyA(10, 0, 0),
    updated_at: hoyA(10, 0, 0),
  },
  {
    id: "c4000000-0000-0000-0000-000000000003",
    cliente_id: "10000000-0000-0000-0000-000000000001",
    cliente_nombre: "Ana López",
    tipo: "primera_visita",
    sala: "piso_ventas",
    inicio: hoyA(16, 0, -5),
    duracion_min: 60,
    estado: "completada",
    resultado: "cotizo",
    pedido_id: null,
    notas: null,
    creada_por: null,
    sucursal_id: S,
    created_at: hoyA(9, 0, -7),
    updated_at: hoyA(17, 0, -5),
  },
];
