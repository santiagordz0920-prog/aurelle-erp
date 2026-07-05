/* Constantes de dominio de Proveedores (§3.10). Área Dinero → solo-admin. */

export type Proveedor = {
  id: string;
  nombre: string;
  contacto: string | null;
  categorias: string[];
  condiciones_pago: string | null;
  notas: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
};

/** Categorías sugeridas (el campo es libre: text[]). */
export const CATEGORIAS_PROVEEDOR = [
  "metales",
  "piedras",
  "casting",
  "engaste",
  "empaque",
  "certificación",
] as const;
