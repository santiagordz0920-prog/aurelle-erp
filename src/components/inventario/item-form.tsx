"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  crearItem,
  type ResultadoAccion,
} from "@/app/(app)/taller/inventario/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TIPO_ITEM, PROPIEDAD_ITEM } from "@/lib/inventario";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Guardando…" : "Guardar item"}
    </Button>
  );
}

export function ItemForm({ esAdmin }: { esAdmin: boolean }) {
  const [estado, action] = useActionState(crearItem, inicial);
  const [tipo, setTipo] = useState("diamante");
  const [propiedad, setPropiedad] = useState("propio");

  const mostrar4C = tipo === "diamante" || tipo === "piedra_color";

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label="SKU" htmlFor="sku" requerido>
          <Input id="sku" name="sku" required placeholder="DIA-001" />
        </Campo>
        <Campo label="Tipo" htmlFor="tipo" requerido>
          <Select
            id="tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {Object.entries(TIPO_ITEM).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Campo>
      </div>

      <Campo label="Nombre" htmlFor="nombre" requerido>
        <Input
          id="nombre"
          name="nombre"
          required
          placeholder="Diamante ovalado 2.2ct"
        />
      </Campo>

      {mostrar4C ? (
        <div className="grid gap-5 sm:grid-cols-4">
          <Campo label="Quilates" htmlFor="quilates">
            <Input id="quilates" name="quilates" inputMode="decimal" placeholder="2.2" />
          </Campo>
          <Campo label="Color" htmlFor="color">
            <Input id="color" name="color" placeholder="F" />
          </Campo>
          <Campo label="Claridad" htmlFor="claridad">
            <Input id="claridad" name="claridad" placeholder="VS1" />
          </Campo>
          <Campo label="Corte" htmlFor="corte">
            <Input id="corte" name="corte" placeholder="Excelente" />
          </Campo>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label="Propiedad" htmlFor="propiedad">
          <Select
            id="propiedad"
            name="propiedad"
            value={propiedad}
            onChange={(e) => setPropiedad(e.target.value)}
          >
            {Object.entries(PROPIEDAD_ITEM).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Campo>
        {propiedad === "consignacion" ? (
          <Campo label="Consignante" htmlFor="consignante">
            <Input id="consignante" name="consignante" placeholder="Consignante A1" />
          </Campo>
        ) : (
          <div />
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label="Ubicación" htmlFor="ubicacion" ayuda="Ej. Vitrina 3, Taller">
          <Input id="ubicacion" name="ubicacion" placeholder="Vitrina 3" />
        </Campo>
        <Campo
          label="Certificado IGI (URL)"
          htmlFor="certificado_url"
          ayuda="La subida de archivos llega con la Biblioteca (Fase 4)"
        >
          <Input id="certificado_url" name="certificado_url" placeholder="https://…" />
        </Campo>
      </div>

      {esAdmin ? (
        <Campo label="Costo (MXN)" htmlFor="costo" ayuda="Solo visible para administradores">
          <Input id="costo" name="costo" inputMode="numeric" placeholder="85000" />
        </Campo>
      ) : null}

      {estado.error ? (
        <p className="text-sm text-destructive">{estado.error}</p>
      ) : null}

      <div className="flex items-center gap-3 pt-1">
        <Guardar />
        <Button asChild variant="ghost">
          <Link href="/taller/inventario">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}

function Campo({
  label,
  htmlFor,
  ayuda,
  requerido,
  children,
}: {
  label: string;
  htmlFor: string;
  ayuda?: string;
  requerido?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {requerido ? <span className="ml-0.5 text-accent">*</span> : null}
      </Label>
      {children}
      {ayuda ? <p className="text-xs text-muted-foreground">{ayuda}</p> : null}
    </div>
  );
}
