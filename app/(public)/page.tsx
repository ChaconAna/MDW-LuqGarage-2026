import { ErrorAutenticacion, requerirUsuario, type UsuarioAutenticado } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  let usuario: UsuarioAutenticado;

  try {
    usuario = await requerirUsuario();
  } catch (error: unknown) {
    if (error instanceof ErrorAutenticacion) {
      redirect("/login");
    }

    throw error;
  }

  if (
    usuario.rol === "RECEPCIONISTA" ||
    usuario.rol === "ENCARGADO_DEL_TALLER"
  ) {
    redirect("/siniestros");
  }

  if (
    usuario.rol === "MECANICO" ||
    usuario.rol === "ADMINISTRADOR"
  ) {
    redirect("/sistema");
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">LuqGarage</h1>
      <p className="mt-2 text-sm opacity-70">
        Sistema de gestión para un taller de chapa y pintura.
      </p>
      <p className="mt-6 text-sm">
        Todavía no hay una pantalla disponible para tu rol.
      </p>
    </main>
  );
}
