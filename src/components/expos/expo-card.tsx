"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Trash2, UserPlus, Check } from "lucide-react";
import {
  cambiarEstadoExpo,
  eliminarExpo,
  capturarLeadExpo,
  type ResultadoAccion,
} from "@/app/(app)/crecimiento/expos/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ESTADOS_EXPO, ESTADO_EXPO, type Expo, type EstadoExpo } from "@/lib/expos";
import { pesos } from "@/lib/inventario";

const inicial: ResultadoAccion = { ok: false };

function GuardarLead() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <UserPlus className="size-4" />
      {pending ? "…" : "Capturar"}
    </Button>
  );
}

export function ExpoCard({ expo }: { expo: Expo }) {
  const [pending, start] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [estadoLead, actionLead] = useActionState(capturarLeadExpo, inicial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estadoLead.ok) formRef.current?.reset();
  }, [estadoLead]);

  const cierres = expo.cerraron ?? 0;
  const cac = cierres > 0 ? expo.costo / cierres : null;
  const roi = expo.costo > 0 ? ((expo.ingreso ?? 0) - expo.costo) / expo.costo : null;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{expo.nombre}</p>
          <p className="text-xs text-muted-foreground">
            {[expo.ciudad, expo.fecha_inicio].filter(Boolean).join(" · ") || "Sin fecha"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={ESTADO_EXPO[expo.estado].clase}>{ESTADO_EXPO[expo.estado].etiqueta}</Badge>
          <Select
            aria-label="Cambiar estado"
            value={expo.estado}
            disabled={pending}
            onChange={(e) => start(async () => { await cambiarEstadoExpo(expo.id, e.target.value as EstadoExpo); })}
            className="h-8 w-32 text-xs"
          >
            {ESTADOS_EXPO.map((e) => (
              <option key={e} value={e}>
                {ESTADO_EXPO[e].etiqueta}
              </option>
            ))}
          </Select>
          <button
            type="button"
            aria-label="Eliminar expo"
            disabled={pending}
            onClick={() => start(async () => { await eliminarExpo(expo.id); })}
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* ROI */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-6">
        <Dato etiqueta="Costo" valor={pesos(expo.costo)} />
        <Dato etiqueta="Leads" valor={`${expo.leads ?? 0}`} />
        <Dato etiqueta="Visitas" valor={`${expo.visitaron ?? 0}`} />
        <Dato etiqueta="Cierres" valor={`${cierres}`} />
        <Dato etiqueta="Ingreso" valor={pesos(expo.ingreso ?? 0)} />
        <Dato
          etiqueta="ROI"
          valor={roi != null ? `${(roi * 100).toFixed(0)}%` : "—"}
          clase={roi != null ? (roi >= 0 ? "text-success" : "text-destructive") : undefined}
        />
      </div>
      {cac != null ? (
        <p className="mt-1 text-xs text-muted-foreground">CAC por cierre: {pesos(cac)}</p>
      ) : null}

      {/* Captura de lead en el stand */}
      <div className="mt-3 border-t border-border pt-3">
        {!abierto ? (
          <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
            <UserPlus className="size-4" />
            Capturar lead
          </Button>
        ) : (
          <form ref={formRef} action={actionLead} className="space-y-2">
            <input type="hidden" name="expo_nombre" value={expo.nombre} />
            <div className="grid gap-2 sm:grid-cols-3">
              <Input name="nombre" placeholder="Nombre*" required />
              <Input name="telefono" placeholder="Teléfono" inputMode="tel" />
              <Input name="fecha_boda" type="date" aria-label="Fecha de boda" />
            </div>
            <div className="flex items-center gap-2">
              <GuardarLead />
              <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
                Cerrar
              </Button>
              {estadoLead.ok ? (
                <span className="inline-flex items-center gap-1 text-xs text-success">
                  <Check className="size-3.5" />
                  Lead capturado
                </span>
              ) : null}
              {estadoLead.error ? <span className="text-xs text-destructive">{estadoLead.error}</span> : null}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor, clase }: { etiqueta: string; valor: string; clase?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className={`font-medium ${clase ?? "text-foreground"}`}>{valor}</p>
    </div>
  );
}
