/* Constantes y lógica de dominio de Producción (§3.5). */

import type { LineaNegocio } from "@/lib/pedidos";

/** Días en una etapa a partir de los cuales se considera atasco (§3.5). */
export const ATASCO_DIAS = 7;

export type EtapaProduccion =
  | "diseno"
  | "cad"
  | "aprobacion_cliente"
  | "casting"
  | "engaste"
  | "pulido"
  | "qc"
  | "listo_entrega";
export type TipoCostoProd = "casting" | "engaste" | "material" | "mano_obra" | "otro";

export type OrdenProduccion = {
  id: string;
  pedido_id: string;
  pedido_cliente?: string | null;
  linea_negocio?: string | null;
  etapa: EtapaProduccion;
  responsable_id: string | null;
  responsable_nombre?: string | null;
  fecha_compromiso: string | null;
  qc_ok: boolean;
  notas: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
  // Relaciones / derivados
  costos?: CostoProduccion[];
  costo_total?: number;
  dias_en_etapa?: number;
};

export type CostoProduccion = {
  id: string;
  orden_id: string;
  tipo: TipoCostoProd;
  concepto: string;
  monto: number;
  registrado_por: string | null;
  created_at: string;
};

/** Orden del kanban. La última etapa cierra la producción (→ listo para entrega). */
export const ETAPAS_PRODUCCION: EtapaProduccion[] = [
  "diseno",
  "cad",
  "aprobacion_cliente",
  "casting",
  "engaste",
  "pulido",
  "qc",
  "listo_entrega",
];

export const ETAPA_PRODUCCION: Record<
  EtapaProduccion,
  { etiqueta: string; clase: string }
> = {
  diseno: { etiqueta: "Diseño", clase: "bg-secondary text-secondary-foreground" },
  cad: { etiqueta: "CAD", clase: "bg-secondary text-secondary-foreground" },
  aprobacion_cliente: { etiqueta: "Aprobación cliente", clase: "bg-warning/15 text-warning" },
  casting: { etiqueta: "Casting", clase: "bg-accent-soft text-accent" },
  engaste: { etiqueta: "Engaste", clase: "bg-accent-soft text-accent" },
  pulido: { etiqueta: "Pulido", clase: "bg-accent-soft text-accent" },
  qc: { etiqueta: "QC", clase: "bg-accent-soft text-accent" },
  listo_entrega: { etiqueta: "Listo para entrega", clase: "bg-success/15 text-success" },
};

export const TIPO_COSTO_PROD: Record<TipoCostoProd, string> = {
  casting: "Casting",
  engaste: "Engaste",
  material: "Material extra",
  mano_obra: "Mano de obra",
  otro: "Otro",
};
export const TIPOS_COSTO_PROD: TipoCostoProd[] = [
  "casting",
  "engaste",
  "material",
  "mano_obra",
  "otro",
];

/** Índice de una etapa (para avanzar/retroceder y calcular progreso). */
export function indiceEtapa(e: EtapaProduccion): number {
  return ETAPAS_PRODUCCION.indexOf(e);
}

/** Siguiente etapa (o null si ya está en listo para entrega). */
export function siguienteEtapa(e: EtapaProduccion): EtapaProduccion | null {
  const i = indiceEtapa(e);
  return i >= 0 && i < ETAPAS_PRODUCCION.length - 1 ? ETAPAS_PRODUCCION[i + 1] : null;
}

/** ¿Puede pasar a "listo para entrega"? Solo con QC completo (§3.5). */
export function puedeCerrar(orden: OrdenProduccion): boolean {
  return orden.qc_ok;
}

/** Días que lleva en la etapa actual (para la alerta de atasco). */
export function diasEnEtapa(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
}

/*
  Checklist de QC por línea de negocio (§3.5). Es una guía pre-vuelo: Fer marca
  cada punto antes de poder cerrar el QC (candado a "listo para entrega"). El
  estado de los checks es efímero (no se persiste); lo que persiste es `qc_ok`.
*/
export const QC_CHECKLIST: Record<LineaNegocio, string[]> = {
  bridal: [
    "Medida de talla correcta vs. pedido",
    "Piedra central centrada y firme (sin juego)",
    "Piedras laterales/pavé completas y parejas",
    "Quilataje y color coinciden con el certificado",
    "Acabado/pulido sin porosidades ni rayones",
    "Grabado interior (si aplica) correcto",
    "Peso final registrado",
    "Limpieza final y estuche listo",
  ],
  concierge: [
    "Especificación del cliente cumplida",
    "Piedras firmes y parejas",
    "Acabado/pulido sin defectos",
    "Medidas correctas vs. pedido",
    "Limpieza final y empaque listo",
  ],
};
