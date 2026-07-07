import type { Documento } from "@/lib/documentos";

/* Datos de muestra — solo modo local. NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";

export const DOCUMENTOS_MUESTRA: Documento[] = [
  {
    id: "e3000000-0000-0000-0000-000000000001",
    pedido_id: "f2000000-0000-0000-0000-000000000001",
    pedido_cliente: "Ana López",
    tipo: "contrato",
    token: "tok-demo-p1",
    estado: "enviado",
    version: 1,
    firmado_por: null,
    firmado_at: null,
    evidencia: null,
    sucursal_id: S,
    created_at: "2026-07-05T18:00:00Z",
    updated_at: "2026-07-05T18:00:00Z",
  },
];
