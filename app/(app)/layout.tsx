import type { ReactNode } from "react";
import Link from "next/link";

import type { RolUsuario } from "@prisma/client";

import { auth, signOut } from "@/auth";
import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { Button } from "@/components/ui/button";
import { autorizarPagina } from "@/lib/authPagina";

const rolesConAccesoAlSistema = [
  "RECEPCIONISTA",
  "ENCARGADO_DEL_TALLER",
  "MECANICO",
  "ADMINISTRADOR",
] as const satisfies readonly RolUsuario[];

const etiquetasRol = {
  RECEPCIONISTA: "Recepcionista",
  ENCARGADO_DEL_TALLER: "Encargado del Taller",
  MECANICO: "Mecánico",
  ADMINISTRADOR: "Administrador",
} satisfies Record<RolUsuario, string>;

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const autorizacion = await autorizarPagina(rolesConAccesoAlSistema);

  if (!autorizacion.autorizado) {
    return <>{children}</>;
  }

  const sesion = await auth();
  const email = sesion?.user?.email ?? "Usuario autenticado";
  const { rol } = autorizacion.usuario;
  const etiquetaRol = etiquetasRol[rol];
  const puedeVerSiniestros =
    rol === "RECEPCIONISTA" || rol === "ENCARGADO_DEL_TALLER";

  return (
    <>
      <header className="border-b border-current/20">
        <ContenedorPagina ancho="wide">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
              <p className="text-lg font-semibold">LuqGarage</p>

              <nav
                aria-label="Navegación principal"
                className="flex flex-wrap gap-x-4 gap-y-2"
              >
                {puedeVerSiniestros ? (
                  <Link
                    href="/siniestros"
                    className="rounded-sm text-link underline underline-offset-4 hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  >
                    Siniestros
                  </Link>
                ) : null}
                <Link
                  href="/sistema"
                  className="rounded-sm text-link underline underline-offset-4 hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  Sistema
                </Link>
              </nav>
            </div>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 text-sm sm:text-right">
                <p className="break-all font-medium">{email}</p>
                <p className="opacity-70">{etiquetaRol}</p>
              </div>

              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
                className="sm:shrink-0"
              >
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Cerrar sesión
                </Button>
              </form>
            </div>
          </div>
        </ContenedorPagina>
      </header>
      {children}
    </>
  );
}
