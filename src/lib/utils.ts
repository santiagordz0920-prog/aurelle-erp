import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind resolviendo conflictos. Usar en todo componente. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "hace 5 min" / "hace 3 h" / "ayer" / "4 jul" — para listas at-a-glance. */
export function tiempoRelativo(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return new Date(iso).toLocaleDateString("es-MX", {
    timeZone: "America/Monterrey",
    day: "numeric",
    month: "short",
  });
}
