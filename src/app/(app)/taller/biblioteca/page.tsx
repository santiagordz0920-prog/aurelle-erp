import Link from "next/link";
import { Images } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { MediaCard } from "@/components/media/media-card";
import { SubirMedia } from "@/components/media/subir-media";
import { listarMedia } from "@/lib/data/media";
import {
  TIPOS_MEDIA,
  TIPO_MEDIA,
  TODAS_ETIQUETAS,
  etiquetaBonita,
  type TipoMedia,
} from "@/lib/media";
import { cn } from "@/lib/utils";

export const metadata = { title: "Biblioteca" };

/*
  Biblioteca de media (§3.8) — galería general: renders, CADs y fotos de todas
  las piezas, con filtro por tipo y por etiqueta (estilo/metal/piedra) para usar
  en marketing y como referencia en citas ("algo así como esta").
*/
export default async function BibliotecaPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; tag?: string }>;
}) {
  const { tipo, tag } = await searchParams;
  const tipoValido = TIPOS_MEDIA.includes(tipo as TipoMedia) ? (tipo as TipoMedia) : undefined;
  const tagValido = TODAS_ETIQUETAS.includes(tag ?? "") ? tag : undefined;
  const media = await listarMedia({ tipo: tipoValido, etiqueta: tagValido });

  const qs = (t?: string, g?: string) => {
    const p = new URLSearchParams();
    if (t) p.set("tipo", t);
    if (g) p.set("tag", g);
    const s = p.toString();
    return s ? `/taller/biblioteca?${s}` : "/taller/biblioteca";
  };

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Biblioteca de media"
        descripcion="Renders, CADs y fotos de todas las piezas. Filtra por estilo, metal o piedra."
        accion={<SubirMedia />}
      />

      {/* Filtro por tipo */}
      <div className="flex flex-wrap gap-1.5">
        <Chip href={qs(undefined, tagValido)} activo={!tipoValido}>
          Todos
        </Chip>
        {TIPOS_MEDIA.map((t) => (
          <Chip key={t} href={qs(t, tagValido)} activo={tipoValido === t}>
            {TIPO_MEDIA[t].etiqueta}
          </Chip>
        ))}
      </div>

      {/* Filtro por etiqueta */}
      <div className="flex flex-wrap gap-1.5">
        {tagValido ? (
          <Chip href={qs(tipoValido, undefined)} activo={false}>
            ✕ {etiquetaBonita(tagValido)}
          </Chip>
        ) : (
          TODAS_ETIQUETAS.map((g) => (
            <Chip key={g} href={qs(tipoValido, g)} activo={false} suave>
              {etiquetaBonita(g)}
            </Chip>
          ))
        )}
      </div>

      {media.length === 0 ? (
        <EmptyState
          icono={Images}
          titulo="Sin archivos en este filtro"
          descripcion="Sube renders, CADs y fotos de las piezas. Etiquétalos por estilo, metal y piedra para armar la galería de referencia que usas en citas y marketing."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((m) => (
            <MediaCard key={m.id} media={m} pedidoId={m.pedido_id} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  href,
  activo,
  suave = false,
  children,
}: {
  href: string;
  activo: boolean;
  suave?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        activo
          ? "border-accent bg-accent text-accent-foreground"
          : suave
            ? "border-border bg-accent-soft/40 text-accent hover:bg-accent-soft"
            : "border-border text-muted-foreground hover:bg-secondary/60",
      )}
    >
      {children}
    </Link>
  );
}
