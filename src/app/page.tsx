import { redirect } from "next/navigation";

// "Hoy" es la pantalla de inicio (Plan Maestro §5, principio UX 1).
export default function Home() {
  redirect("/hoy");
}
