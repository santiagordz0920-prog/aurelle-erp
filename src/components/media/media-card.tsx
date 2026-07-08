import { FileText, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MediaAcciones } from "@/components/media/media-acciones";
import { BotonWhatsApp } from "@/components/mensajeria/boton-whatsapp";
import { TIPO_MEDIA, esImagen, etiquetaBonita, mensajeCompartirMedia, type Media } from "@/lib/media";

/* Tarjeta de una pieza de media. Muestra la imagen (URL firmada) o un icono de
   archivo para no-imágenes (CAD/PDF), con su tipo, versión, etiquetas y acciones. */
export function MediaCard({
  media,
  pedidoId,
  telefono,
  clienteNombre,
  conAcciones = true,
}: {
  media: Media;
  pedidoId?: string | null;
  telefono?: string | null;
  clienteNombre?: string | null;
  conAcciones?: boolean;
}) {
  const imagen = esImagen(media.nombre ?? media.storage_path) || media.url?.startsWith("data:image");
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative aspect-square bg-secondary/40">
        {imagen && media.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.url} alt={media.nombre ?? "Media"} className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <FileText className="size-8" />
            <span className="px-2 text-center text-xs">{media.nombre ?? "Archivo"}</span>
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <Badge className={TIPO_MEDIA[media.tipo].clase}>{TIPO_MEDIA[media.tipo].etiqueta}</Badge>
          {media.tipo === "render" && media.version > 1 ? (
            <Badge className="bg-secondary text-secondary-foreground">v{media.version}</Badge>
          ) : null}
        </div>
        {media.aprobado ? (
          <div className="absolute right-2 top-2">
            <Badge className="bg-success/15 text-success">
              <CheckCircle2 className="size-3" />
              Aprobado
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 p-3">
        {media.nombre ? (
          <p className="truncate text-sm font-medium text-foreground">{media.nombre}</p>
        ) : null}
        {media.etiquetas.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {media.etiquetas.map((t) => (
              <span key={t} className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">
                {etiquetaBonita(t)}
              </span>
            ))}
          </div>
        ) : null}
        {telefono ? (
          <BotonWhatsApp
            telefono={telefono}
            texto={mensajeCompartirMedia(media.tipo, clienteNombre ?? null, media.url ?? null)}
            etiqueta="Enviar"
          />
        ) : null}
        {conAcciones ? (
          <MediaAcciones
            id={media.id}
            tipo={media.tipo}
            aprobado={media.aprobado}
            pedidoId={pedidoId}
          />
        ) : null}
      </div>
    </div>
  );
}
