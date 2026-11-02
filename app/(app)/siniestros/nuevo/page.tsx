import Link from "next/link";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { autorizarPagina } from "@/lib/authPagina";
import { clasesEnlaceTexto } from "@/lib/utils";

export default async function SiniestroNuevoPage() {
  const autorizacion = await autorizarPagina([
    "RECEPCIONISTA",
    "ENCARGADO_DEL_TALLER",
  ]);

  if (!autorizacion.autorizado) {
    return (
      <main>
        <ContenedorPagina ancho="narrow">
          <h1 className="text-2xl font-bold">Acceso denegado</h1>
          <p className="mt-3">No tenés permisos para registrar siniestros.</p>
        </ContenedorPagina>
      </main>
    );
  }

  return (
    <main>
      <ContenedorPagina ancho="narrow">
        <div className="space-y-6">
          <Link
            href="/siniestros"
            className={`${clasesEnlaceTexto} inline-block text-sm`}
          >
            Volver a siniestros
          </Link>

          <h1 className="text-2xl font-bold">Registrar siniestro</h1>
          <p>El formulario de registro de siniestros todavía no está implementado.</p>
        </div>
      </ContenedorPagina>
    </main>
  );
}
