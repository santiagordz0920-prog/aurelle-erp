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
  sucursal_id: string;
  created_at: string;
  updated_at: string;
};

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
