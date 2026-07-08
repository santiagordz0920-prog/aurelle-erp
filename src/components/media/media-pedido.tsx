import { ImageOff } from "lucide-react";
import { MediaCard } from "@/components/media/media-card";
import { SubirMedia } from "@/components/media/subir-media";
import { listarMediaDePedido } from "@/lib/data/media";

/* Galería de media de un pedido, para su ficha. Carpeta automática: renders,
   CADs, fotos por etapa y foto final. Subida directa y acciones por pieza. */
export async function MediaPedido({
  pedidoId,
  clienteId,
}: {
  pedidoId: string;
  clienteId?: string | null;
}) {
  const media = await listarMediaDePedido(pedidoId);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {media.length > 0
            ? `${media.length} ${media.length === 1 ? "archivo" : "archivos"} · renders, CAD y fotos.`
            : "Sube renders, CAD y fotos de la pieza."}
        </p>
        <SubirMedia pedidoId={pedidoId} clienteId={clienteId} />
      </div>

      {media.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
          <ImageOff className="size-6" />
          <p className="text-sm">Sin archivos todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((m) => (
            <MediaCard key={m.id} media={m} pedidoId={pedidoId} />
          ))}
        </div>
      )}
    </div>
  );
}
