import { AppShell } from "@/components/app-shell";
import { getUsuarioActual } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioActual();
  return (
    <AppShell rol={usuario.rol} usuario={{ nombre: usuario.nombre }}>
      {children}
    </AppShell>
  );
}
