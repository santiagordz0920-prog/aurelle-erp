"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

/*
  Área de firma con el dedo/mouse. Escribe el trazo como dataURL (PNG) en un
  input oculto `name` para que viaje con el form. Es evidencia adicional; la
  firma legal sigue siendo nombre + aceptación + fecha/hora.
*/
export function CanvasFirma({ name }: { name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const dibujando = useRef(false);
  const [hayTrazo, setHayTrazo] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Ajuste a densidad de pantalla para un trazo nítido.
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#08221b";
    }
  }, []);

  function punto(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function inicio(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = punto(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    dibujando.current = true;
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = punto(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function fin() {
    if (!dibujando.current) return;
    dibujando.current = false;
    const canvas = canvasRef.current;
    if (canvas && hiddenRef.current) {
      hiddenRef.current.value = canvas.toDataURL("image/png");
      setHayTrazo(true);
    }
  }

  function limpiar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (hiddenRef.current) hiddenRef.current.value = "";
    setHayTrazo(false);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#08221b]">Firma (opcional)</span>
        {hayTrazo ? (
          <button
            type="button"
            onClick={limpiar}
            className="inline-flex items-center gap-1 text-xs text-[#3d4a44] hover:text-[#08221b]"
          >
            <Eraser className="size-3.5" />
            Limpiar
          </button>
        ) : null}
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={inicio}
        onPointerMove={mover}
        onPointerUp={fin}
        onPointerLeave={fin}
        className="h-40 w-full touch-none rounded-md border border-dashed border-[#c9bfa6] bg-[#faf7f0]"
      />
      <input ref={hiddenRef} type="hidden" name={name} defaultValue="" />
      <p className="text-xs text-[#7a8580]">Dibuja tu firma con el dedo o el mouse.</p>
    </div>
  );
}
