import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Hammer,
  Wallet,
  TrendingUp,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Rol } from "./roles";

/*
  Navegación agrupada por trabajo real (Plan Maestro §5). El orden es el orden
  de la barra lateral (escritorio) y de los tabs (móvil). `soloAdmin` oculta el
  área a roles no-admin en la UI; la RLS lo garantiza en la base de datos.
*/

export type AreaNav = {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  descripcion: string;
  soloAdmin?: boolean;
};

export const AREAS: AreaNav[] = [
  {
    href: "/hoy",
    etiqueta: "Hoy",
    icono: LayoutDashboard,
    descripcion: "Dashboard, tareas y aprobaciones",
  },
  {
    href: "/clientes",
    etiqueta: "Clientes",
    icono: Users,
    descripcion: "CRM, conversaciones y citas",
  },
  {
    href: "/ventas",
    etiqueta: "Ventas",
    icono: ShoppingBag,
    descripcion: "Cotizaciones y pedidos",
  },
  {
    href: "/taller",
    etiqueta: "Taller",
    icono: Hammer,
    descripcion: "Producción, inventario y biblioteca",
  },
  {
    href: "/dinero",
    etiqueta: "Dinero",
    icono: Wallet,
    descripcion: "Finanzas, proveedores, gastos y comisiones",
    soloAdmin: true,
  },
  {
    href: "/crecimiento",
    etiqueta: "Crecimiento",
    icono: TrendingUp,
    descripcion: "Marketing y expos",
    soloAdmin: true,
  },
  {
    href: "/sistema",
    etiqueta: "Sistema",
    icono: Settings,
    descripcion: "Usuarios, plantillas, conocimiento y configuración",
  },
];

/** Áreas visibles para un rol (filtra las soloAdmin). */
export function areasVisibles(rol: Rol): AreaNav[] {
  return AREAS.filter((a) => !a.soloAdmin || rol === "admin");
}
