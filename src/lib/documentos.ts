/* Constantes y tipos de Documentos (§3.12). */

export type TipoDocumento = "contrato" | "nota_remision" | "adenda";
export type EstadoDocumento = "borrador" | "enviado" | "firmado" | "cancelado";

export type Documento = {
  id: string;
  pedido_id: string;
  pedido_cliente?: string | null;
  tipo: TipoDocumento;
  token: string;
  estado: EstadoDocumento;
  version: number;
  firmado_por: string | null;
  firmado_at: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evidencia: Record<string, any> | null;
  // Snapshot inmutable del contrato al firmar (ContratoDatos). NULL hasta firmar;
  // un documento firmado se renderiza desde aquí, no del pedido en vivo (0022).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contenido?: Record<string, any> | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
};

/** Cláusula legal del contrato (editable, 0024). */
export type ClausulaContrato = {
  id: string;
  titulo: string;
  cuerpo: string;
  posicion: number;
  activo: boolean;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
};

/** Solo el texto que se imprime/congela (título + cuerpo). */
export type ClausulaTexto = { titulo: string; cuerpo: string };

/*
  Cláusulas por defecto = semilla de la tabla `clausula_contrato` y fallback:
  las usa `<ContratoDoc>` si un contrato (o su snapshot) no trae cláusulas, para
  no dejar el contrato sin términos legales.
*/
export const CLAUSULAS_CONTRATO_DEFAULT: ClausulaTexto[] = [
  {
    titulo: "Anticipos",
    cuerpo:
      "La fabricación inicia una vez cubierto el anticipo convenido; la compra de materiales requiere el anticipo del 30%. El saldo se liquida antes de la entrega.",
  },
  {
    titulo: "Garantía",
    cuerpo:
      "La pieza cuenta con garantía de por vida contra defectos de fabricación y servicio de limpieza y pulido sin costo. No cubre daño por mal uso.",
  },
  {
    titulo: "Especificaciones",
    cuerpo:
      "Las piedras y características corresponden a la cotización aceptada; cualquier cambio se documenta como adenda.",
  },
];

export const TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  contrato: "Contrato",
  nota_remision: "Nota de remisión",
  adenda: "Adenda",
};

export const ESTADO_DOCUMENTO: Record<
  EstadoDocumento,
  { etiqueta: string; clase: string }
> = {
  borrador: { etiqueta: "Borrador", clase: "bg-secondary text-secondary-foreground" },
  enviado: { etiqueta: "Enviado para firma", clase: "bg-warning/15 text-warning" },
  firmado: { etiqueta: "Firmado", clase: "bg-success/15 text-success" },
  cancelado: { etiqueta: "Cancelado", clase: "bg-muted text-muted-foreground line-through" },
};
