import Link from "next/link";
import { Cake, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BotonWhatsApp } from "@/components/mensajeria/boton-whatsapp";
import { PLANTILLAS_MENSAJE } from "@/lib/mensajes";
import { etiquetaDias, fechaCorta, type FechaClave } from "@/lib/fechas-clave";

/*
  Renglón de una fecha clave (cumpleaños / aniversario) con envío asistido:
  arma el mensaje desde la plantilla del CRM y abre WhatsApp listo para enviar.
*/

function mensajeDe(fc: FechaClave): string {
  const id = fc.tipo === "cumpleanos" ? "cumpleanos" : "aniversario";
  const plantilla = PLANTILLAS_MENSAJE.find((p) => p.id === id);
  return plantilla ? plantilla.cuerpo({ nombre: fc.cliente_nombre, pareja: fc.pareja }) : "";
}

export function FechaClaveItem({ fc }: { fc: FechaClave }) {
  const esCumple = fc.tipo === "cumpleanos";
  const Icono = esCumple ? Cake : Heart;
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <Icono className="size-3.5 text-accent" />
          <Link
            href={`/clientes/${fc.cliente_id}`}
            className="font-medium text-foreground hover:text-accent hover:underline"
          >
            {fc.cliente_nombre}
          </Link>
          <Badge className={esCumple ? "bg-accent-soft text-accent" : "bg-secondary text-secondary-foreground"}>
            {esCumple ? "Cumpleaños" : "Aniversario"}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {fechaCorta(fc.fecha)} · {etiquetaDias(fc.dias)}
          {fc.anios
            ? esCumple
              ? ` · cumple ${fc.anios}`
              : ` · ${fc.anios}° aniversario`
            : ""}
        </p>
      </div>
      <BotonWhatsApp
        telefono={fc.telefono}
        texto={mensajeDe(fc)}
        etiqueta="Felicitar"
      />
    </li>
  );
}
