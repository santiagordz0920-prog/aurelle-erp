import { Badge } from "@/components/ui/badge";
import { ESTADO_PIPELINE, CANAL_FUENTE, type EstadoPipeline, type CanalFuente } from "@/lib/clientes";

export function EstadoBadge({ estado }: { estado: EstadoPipeline }) {
  const e = ESTADO_PIPELINE[estado];
  return <Badge className={e.clase}>{e.etiqueta}</Badge>;
}

export function CanalBadge({
  canal,
  detalle,
}: {
  canal: CanalFuente | null;
  detalle?: string | null;
}) {
  if (!canal) return null;
  return (
    <span className="text-xs text-muted-foreground">
      {CANAL_FUENTE[canal]}
      {detalle ? ` · ${detalle}` : ""}
    </span>
  );
}
