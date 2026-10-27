import { signIn } from "@/auth";
import { ErrorAutenticacion, requerirUsuario, type UsuarioAutenticado } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  let usuario: UsuarioAutenticado | null = null;

  try {
    usuario = await requerirUsuario();
  } catch (error: unknown) {
    if (!(error instanceof ErrorAutenticacion)) {
      throw error;
    }
  }

  if (
    usuario?.rol === "RECEPCIONISTA" ||
    usuario?.rol === "ENCARGADO_DEL_TALLER"
  ) {
    redirect("/siniestros");
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">LuqGarage</h1>
      <p className="mt-2 text-sm opacity-70">
        Sistema de gestión para un taller de chapa y pintura.
      </p>
      {usuario ? (
        <p className="mt-6 text-sm">
          Todavía no hay una pantalla disponible para tu rol.
        </p>
      ) : (
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Entrar con Google
          </button>
        </form>
      )}
    </main>
  );
}
