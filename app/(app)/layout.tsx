import type { ReactNode } from "react";

import type { RolUsuario } from "@prisma/client";

import { auth, signOut } from "@/auth";
import ContenedorPagina from "@/components/layout/ContenedorPagina";
import LogoLuqGarage from "@/components/layout/LogoLuqGarage";
import NavegacionPrincipal, { type EnlaceNavegacion } from "@/components/layout/NavegacionPrincipal";
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
  const puedeVerPresupuestos =
    rol === "RECEPCIONISTA" || rol === "ENCARGADO_DEL_TALLER";
  const puedeVerClientes =
    rol === "RECEPCIONISTA" || rol === "ENCARGADO_DEL_TALLER";
  const puedeVerVehiculos =
    rol === "RECEPCIONISTA" || rol === "ENCARGADO_DEL_TALLER";

  const enlaces: EnlaceNavegacion[] = [];
  if (puedeVerSiniestros) enlaces.push({ href: "/siniestros", etiqueta: "Siniestros" });
  if (puedeVerPresupuestos) enlaces.push({ href: "/presupuestos", etiqueta: "Presupuestos" });
  if (puedeVerClientes) enlaces.push({ href: "/clientes", etiqueta: "Clientes" });
  if (puedeVerVehiculos) enlaces.push({ href: "/vehiculos", etiqueta: "Vehículos" });
  if (rol === "ENCARGADO_DEL_TALLER" || rol === "MECANICO") {
    enlaces.push({ href: "/ordenes-trabajo", etiqueta: "Órdenes de trabajo" });
  }
  enlaces.push({ href: "/sistema", etiqueta: "Sistema" });

  return (
    <>
      <header className="border-b border-border">
        <ContenedorPagina ancho="wide">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <LogoLuqGarage />

            <div className="flex min-w-0 flex-col gap-3 sm:items-end md:flex-row md:items-center md:gap-4">
              <div className="min-w-0 text-sm sm:text-right">
                <p className="font-medium [overflow-wrap:anywhere]">{email}</p>
                <p className="mt-1 inline-block max-w-full rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  {etiquetaRol}
                </p>
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
                  className="min-h-11 w-full sm:w-auto"
                >
                  Cerrar sesión
                </Button>
              </form>
            </div>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <NavegacionPrincipal enlaces={enlaces} />
          </div>
        </ContenedorPagina>
      </header>
      {children}
    </>
  );
}
