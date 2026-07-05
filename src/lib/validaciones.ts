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
