import { z } from "zod";

const opcional = <T extends z.ZodTypeAny>(s: T) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), s.optional());

/* Alta / edición de cliente. Solo el nombre es obligatorio (captura rápida). */
export const clienteSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio."),
  telefono: opcional(
    z
      .string()
      .trim()
      .regex(/^[+0-9()\s-]{7,20}$/, "Teléfono no válido."),
  ),
  fecha_nacimiento: opcional(z.string()),
  fecha_boda: opcional(z.string()),
  pareja_nombre: opcional(z.string().trim()),
  fuente_canal: opcional(
    z.enum(["ads", "expo", "referido", "organico"]),
  ),
  fuente_detalle: opcional(z.string().trim()),
  etiquetas: opcional(z.string().trim()), // coma-separadas en el form
});

export type ClienteInput = z.infer<typeof clienteSchema>;

export const notaSchema = z.object({
  cliente_id: z.string().uuid(),
  texto: z.string().trim().min(1, "La nota no puede estar vacía."),
});

/* Alta de item de inventario. */
export const itemSchema = z.object({
  sku: z.string().trim().min(1, "El SKU es obligatorio."),
  tipo: z.enum([
    "piedra_color",
    "diamante",
    "montura",
    "pieza_terminada",
    "churumbela",
  ]),
  nombre: z.string().trim().min(2, "El nombre es obligatorio."),
  descripcion: opcional(z.string().trim()),
  quilates: opcional(z.coerce.number().positive("Quilates no válido.")),
  color: opcional(z.string().trim()),
  claridad: opcional(z.string().trim()),
  corte: opcional(z.string().trim()),
  propiedad: z.enum(["propio", "consignacion"]),
  consignante: opcional(z.string().trim()),
  ubicacion: opcional(z.string().trim()),
  certificado_url: opcional(z.string().trim()),
  costo: opcional(z.coerce.number().nonnegative("Costo no válido.")),
});

export type ItemInput = z.infer<typeof itemSchema>;
