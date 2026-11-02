import type { ReactNode } from "react";
import Link from "next/link";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { autorizarPagina } from "@/lib/authPagina";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const autorizacion = await autorizarPagina([
    "RECEPCIONISTA",
    "ENCARGADO_DEL_TALLER",
  ]);

  return (
    <>
      {autorizacion.autorizado ? (
        <header className="border-b border-current/20">
          <ContenedorPagina ancho="wide">
            <nav aria-label="Navegación principal">
              <Link
                href="/siniestros"
                className="rounded-sm text-link underline underline-offset-4 hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                Siniestros
              </Link>
            </nav>
          </ContenedorPagina>
        </header>
      ) : null}
      {children}
    </>
  );
}
