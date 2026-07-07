import Link from "next/link";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CitaAcciones } from "@/components/citas/cita-acciones";
import { BotonWhatsApp } from "@/components/mensajeria/boton-whatsapp";
import {
  ESTADO_CITA,
  RESULTADO_CITA,
  SALA_CITA,
  TIPO_CITA,
  finCita,
  type Cita,
} from "@/lib/citas";

const TZ = "America/Monterrey";

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Mensaje de confirmación en tono Aurelle, con fecha y hora en horario de Monterrey. */
function textoConfirmacion(cita: Cita): string {
  const nombre = cita.cliente_nombre ? ` ${cita.cliente_nombre}` : "";
  return `Hola${nombre}, te confirmamos tu cita en Aurelle & Co. el ${fechaLarga(
    cita.inicio,
  )} a las ${hora(cita.inicio)} h. Te esperamos con mucho gusto. Si necesitas reagendar, escríbenos por aquí. ✨`;
}

export function CitaItem({
  cita,
  ocultarCliente = false,
}: {
  cita: Cita;
  ocultarCliente?: boolean;
}) {
  const fin = finCita(cita.inicio, cita.duracion_min).toISOString();
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="size-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">
            {hora(cita.inicio)}–{hora(fin)}
          </span>
          <span className="text-muted-foreground">· {TIPO_CITA[cita.tipo].etiqueta}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {!ocultarCliente ? (
            <Link href={`/clientes/${cita.cliente_id}`} className="text-accent hover:underline">
              {cita.cliente_nombre ?? "Cliente"}
            </Link>
          ) : null}
          <span>{SALA_CITA[cita.sala]}</span>
          <Badge className={ESTADO_CITA[cita.estado].clase}>
            {ESTADO_CITA[cita.estado].etiqueta}
          </Badge>
          {cita.resultado ? (
            <Badge className={RESULTADO_CITA[cita.resultado].clase}>
              {RESULTADO_CITA[cita.resultado].etiqueta}
            </Badge>
          ) : null}
          {cita.notas ? <span className="truncate">· {cita.notas}</span> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {cita.cliente_telefono &&
        (cita.estado === "agendada" || cita.estado === "confirmada") ? (
          <BotonWhatsApp
            telefono={cita.cliente_telefono}
            texto={textoConfirmacion(cita)}
            etiqueta="Confirmar"
          />
        ) : null}
        <CitaAcciones id={cita.id} estado={cita.estado} />
      </div>
    </li>
  );
}
