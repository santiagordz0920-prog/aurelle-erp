import { z } from "zod";

const opcional = <T extends z.ZodTypeAny>(s: T) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), s.optional());

/*
  Datos de contacto del cliente (intake multicanal: WhatsApp/IG/Messenger/Expos).
  El teléfono se guarda SIN espacios ni separadores (WhatsApp lo copia con
  espacios). Regla: mínimo UN dato de contacto; contacto_preferido debe apuntar
  a un campo con valor (si no viene, la acción elige el primero con valor).
*/
export const contactoCampos = {
  telefono: opcional(
    z
      .string()
      .trim()
      .regex(/^[+0-9()\s-]{7,20}$/, "Teléfono no válido.")
      .transform((t) => t.replace(/[^0-9+]/g, "")),
  ),
  correo: opcional(z.string().trim().email("Correo no válido.")),
  instagram: opcional(z.string().trim()),
  facebook: opcional(z.string().trim()),
  otro_contacto: opcional(z.string().trim()),
  contacto_preferido: opcional(
    z.enum(["telefono", "correo", "instagram", "facebook", "otro"]),
  ),
};

type ConContacto = {
  telefono?: string;
  correo?: string;
  instagram?: string;
  facebook?: string;
  otro_contacto?: string;
  contacto_preferido?: "telefono" | "correo" | "instagram" | "facebook" | "otro";
};

/** Regla compartida: al menos un contacto, y el preferido debe tener valor. */
export function validarContacto(d: ConContacto, ctx: z.RefinementCtx) {
  const valores: Record<string, string | undefined> = {
    telefono: d.telefono,
    correo: d.correo,
    instagram: d.instagram,
    facebook: d.facebook,
    otro: d.otro_contacto,
  };
  if (!Object.values(valores).some(Boolean)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Registra al menos un dato de contacto (teléfono, correo, Instagram, Messenger u otro).",
    });
  }
  if (d.contacto_preferido && !valores[d.contacto_preferido]) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El contacto preferido apunta a un campo vacío.",
    });
  }
}

/* Alta / edición de cliente. Nombre + al menos un dato de contacto. */
export const clienteSchema = z
  .object({
    nombre: z.string().trim().min(2, "El nombre es obligatorio."),
    ...contactoCampos,
    fecha_nacimiento: opcional(z.string()),
    fecha_boda: opcional(z.string()),
    pareja_nombre: opcional(z.string().trim()),
    fuente_canal: opcional(
      z.enum(["ads", "expo", "referido", "organico"]),
    ),
    fuente_detalle: opcional(z.string().trim()),
    etiquetas: opcional(z.string().trim()), // coma-separadas en el form
  })
  .superRefine(validarContacto);

export type ClienteInput = z.infer<typeof clienteSchema>;

/* Edición de contacto desde la ficha (misma regla de mínimo un contacto). */
export const contactoSchema = z
  .object({
    cliente_id: z.string().uuid(),
    ...contactoCampos,
  })
  .superRefine(validarContacto);

export type ContactoInput = z.infer<typeof contactoSchema>;

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
