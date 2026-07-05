import { cn } from "@/lib/utils";

/*
  Wordmark de Aurelle en texto. La tipografía de marca (Feature Deck) tiene
  licencia solo de escritorio y se reserva para los PDFs generados server-side;
  aquí usamos Inter con tracking amplio para evocar la marca sin violar licencia.
  Cuando se compren licencias webfont, este es el único lugar a cambiar.
*/
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "select-none text-lg font-semibold uppercase tracking-[0.28em] text-primary",
        className,
      )}
    >
      Aurelle
    </span>
  );
}
