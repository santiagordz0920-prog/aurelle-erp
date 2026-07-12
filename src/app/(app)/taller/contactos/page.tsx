import Link from "next/link";
import { ArrowLeft, BookUser, Clock, Tag } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  ContactoUtilForm,
  EliminarContactoForm,
} from "@/components/contactos/contacto-util-form";
import { listarContactosUtiles } from "@/lib/data/contactos-utiles";
import {
  ORDEN_TIPOS_CONTACTO,
  etiquetaTipoContacto,
  pluralTipoContacto,
  type ContactoUtil,
} from "@/lib/contactos-utiles";

export const metadata = { title: "Contactos útiles" };

export default async function ContactosUtilesPage() {
  const contactos = await listarContactosUtiles();

  const grupos = ORDEN_TIPOS_CONTACTO.map((tipo) => ({
    tipo,
    contactos: contactos.filter((c) => c.tipo === tipo),
  })).filter((g) => g.contactos.length > 0);

  return (
    <div className="space-y-5">
      <Link
        href="/taller"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Taller
      </Link>

      <PageHeader
        titulo="Contactos útiles"
        descripcion="Directorio para tercerizar procesos: joyeros, vaciadores y montadores con su especialidad, tiempos y precios estimados."
      />

      <ContactoUtilForm />

      {contactos.length === 0 ? (
        <EmptyState
          icono={BookUser}
          titulo="Aún no hay contactos"
          descripcion="Vacía aquí los contactos que han juntado: joyeros, vaciadores, montadores… Solo el nombre es obligatorio."
        />
      ) : (
        <div className="space-y-5">
          {grupos.map((g) => (
            <section key={g.tipo}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {g.contactos.length > 1
                  ? `${pluralTipoContacto(g.tipo)} · ${g.contactos.length}`
                  : etiquetaTipoContacto(g.tipo)}
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {g.contactos.map((c) => (
                  <TarjetaContacto key={c.id} contacto={c} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaContacto({ contacto: c }: { contacto: ContactoUtil }) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{c.nombre}</p>
          {c.contacto ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{c.contacto}</p>
          ) : null}
          {c.especialidad ? (
            <p className="mt-1 text-sm text-foreground/80">{c.especialidad}</p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {c.tiempo_entrega ? (
              <Badge className="bg-accent-soft text-accent">
                <Clock className="mr-1 size-3" />
                {c.tiempo_entrega}
              </Badge>
            ) : null}
            {c.precio_estimado ? (
              <Badge className="bg-accent-soft text-accent">
                <Tag className="mr-1 size-3" />
                {c.precio_estimado}
              </Badge>
            ) : null}
          </div>
          {c.notas ? (
            <p className="mt-2 text-xs text-muted-foreground">{c.notas}</p>
          ) : null}
        </div>
        <EliminarContactoForm id={c.id} nombre={c.nombre} />
      </div>
    </li>
  );
}
