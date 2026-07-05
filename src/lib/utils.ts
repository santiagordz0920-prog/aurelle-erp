import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind resolviendo conflictos. Usar en todo componente. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
