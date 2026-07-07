import { CalendarHeart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { FechaClaveItem } from "@/components/clientes/fecha-clave-item";
import { fechasClaveProximas } from "@/lib/data/clientes";

export const metadata = { title: "Fechas importantes" };

const VENTANA_DIAS = 30;

/*
  Fechas importantes (§3.1 lifecycle): cumpleaños y aniversarios de boda de los
  próximos 30 días, con felicitación asistida por WhatsApp. Usable a mano hoy;
  la cadencia automática llega con el riel oficial de Meta.
*/
export default async function FechasPage() {
  const fechas = await fechasClaveProximas(VENTANA_DIAS);

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Fechas importantes"
        descripcion={`Cumpleaños y aniversarios de boda en los próximos ${VENTANA_DIAS} días. Un mensaje a tiempo reactiva y fideliza.`}
      />

      {fechas.length === 0 ? (
        <EmptyState
          icono={CalendarHeart}
          titulo="Nada en el horizonte cercano"
          descripcion="Cuando un cliente tenga cumpleaños o aniversario de boda dentro de los próximos 30 días, aparecerá aquí con un botón para felicitarlo por WhatsApp. Captura estas fechas en la ficha del cliente."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {fechas.map((fc) => (
                <FechaClaveItem key={`${fc.cliente_id}-${fc.tipo}`} fc={fc} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
