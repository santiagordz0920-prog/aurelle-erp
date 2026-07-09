import type { PiezaEntregada, ServicioPieza } from "@/lib/postventa";

/* Datos de muestra — solo modo local. NUNCA en producción. */

function haceMeses(m: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  return d.toISOString();
}
function fechaMasMesesLocal(iso: string, meses: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

const entregada = haceMeses(11); // entregada hace 11 meses → garantía por vencer

export const PIEZAS_MUESTRA: PiezaEntregada[] = [
  {
    id: "pe000000-0000-0000-0000-000000000001",
    pedido_id: "f2000000-0000-0000-0000-000000000003",
    cliente_id: "10000000-0000-0000-0000-000000000001",
    cliente_nombre: "Ana López",
    entregada_at: entregada,
    garantia_meses: 12,
    garantia_hasta: fechaMasMesesLocal(entregada, 12),
    aniversario_entrega: entregada.slice(0, 10),
    aniversario_boda: null,
    notas: null,
    servicios: [],
  },
];

export const SERVICIOS_MUESTRA: ServicioPieza[] = [
  {
    id: "sv000000-0000-0000-0000-000000000001",
    pieza_id: "pe000000-0000-0000-0000-000000000001",
    tipo: "limpieza",
    descripcion: "Limpieza de cortesía",
    costo: 0,
    fecha: new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
  },
];
