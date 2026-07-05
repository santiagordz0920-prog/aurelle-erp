/*
  Roles del sistema (Plan Maestro §3.17). Los permisos REALES viven en la base
  de datos vía RLS; estos tipos son el espejo en la interfaz para ocultar/mostrar
  navegación y datos sensibles. Nunca confiar solo en esto para seguridad.
*/

export type Rol = "admin" | "ventas" | "taller";

export const ROLES: Record<Rol, { etiqueta: string; descripcion: string }> = {
  admin: {
    etiqueta: "Admin",
    descripcion: "Acceso total. Santiago y Fer.",
  },
  ventas: {
    etiqueta: "Ventas",
    descripcion:
      "CRM, citas, cotizador (solo precio final), pedidos (sin costos ni margen), documentos, biblioteca.",
  },
  taller: {
    etiqueta: "Taller",
    descripcion: "Producción, inventario (sin costos), biblioteca, sus tareas.",
  },
};

/** Áreas que solo el rol admin puede ver (Dinero, Crecimiento — Plan Maestro §5). */
export function puedeVerAreaAdmin(rol: Rol): boolean {
  return rol === "admin";
}
