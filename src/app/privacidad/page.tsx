/*
  Aviso de privacidad público (requisito de Meta para publicar la app de
  WhatsApp; también buena práctica LFPDPPP). Página estática, sin sesión,
  fuera del cascarón — Meta y los clientes la abren sin cuenta.
*/
export const metadata = {
  title: "Aviso de privacidad · Aurelle & Co.",
  robots: { index: false },
};

const ACTUALIZADO = "8 de julio de 2026";

export default function PrivacidadPage() {
  return (
    <div className="min-h-dvh bg-[#f5f2eb] px-4 py-10 text-[#08221b]">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-[#5b6660]">
            Aurelle &amp; Co. · Monterrey, México
          </p>
          <h1 className="font-serif text-3xl">Aviso de privacidad</h1>
          <p className="text-sm text-[#5b6660]">Última actualización: {ACTUALIZADO}</p>
        </header>

        <section className="space-y-4 text-sm leading-relaxed">
          <p>
            Aurelle &amp; Co. (&quot;Aurelle&quot;) es una joyería con showroom en Monterrey,
            Nuevo León, México. Este aviso explica qué datos personales tratamos cuando te
            comunicas con nosotros —incluido WhatsApp y otros canales de mensajería—, para
            qué los usamos y cómo puedes ejercer tus derechos.
          </p>

          <h2 className="pt-2 font-serif text-xl">Datos que recabamos</h2>
          <p>
            Nombre y datos de contacto (teléfono, correo), el contenido de los mensajes que
            nos envías (texto e imágenes), información de tus citas en el showroom y, si
            realizas una compra, los datos necesarios para tu pedido, contrato y facturación.
          </p>

          <h2 className="pt-2 font-serif text-xl">Para qué los usamos</h2>
          <p>
            Para responder tus mensajes y atender tu solicitud, agendar y dar seguimiento a
            citas, elaborar cotizaciones y pedidos, cumplir obligaciones legales y de
            facturación, y —solo si nos escribiste primero o lo aceptaste— enviarte
            recordatorios o felicitaciones. Algunas respuestas iniciales por WhatsApp pueden
            ser generadas con asistencia de inteligencia artificial y siempre están
            supervisadas por nuestro equipo; las decisiones sensibles las toma una persona.
          </p>

          <h2 className="pt-2 font-serif text-xl">Con quién se comparten</h2>
          <p>
            No vendemos ni rentamos tus datos. Usamos proveedores que nos prestan servicios
            de tecnología —mensajería (WhatsApp / Meta Platforms), alojamiento y base de
            datos, y procesamiento con IA— únicamente para operar los fines descritos, bajo
            sus propios avisos de privacidad y medidas de seguridad.
          </p>

          <h2 className="pt-2 font-serif text-xl">Tus derechos (ARCO)</h2>
          <p>
            Puedes solicitar el acceso, rectificación, cancelación u oposición sobre tus
            datos, así como retirar tu consentimiento, escribiéndonos a{" "}
            <a className="underline" href="mailto:nubomarket@gmail.com">
              nubomarket@gmail.com
            </a>
            . Atenderemos tu solicitud en los plazos que marca la Ley Federal de Protección
            de Datos Personales en Posesión de los Particulares.
          </p>

          <h2 className="pt-2 font-serif text-xl">Cambios a este aviso</h2>
          <p>
            Si este aviso cambia, publicaremos la versión actualizada en esta misma página
            con su nueva fecha.
          </p>
        </section>
      </div>
    </div>
  );
}
