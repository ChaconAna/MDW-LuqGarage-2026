import Link from "next/link";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { autorizarPagina } from "@/lib/authPagina";
import { listarClientesActivos } from "@/lib/db/cliente";
import { clasesEnlaceTexto } from "@/lib/utils";

const LIMITE_CLIENTES = 10;

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

  const { clientes, total } = await listarClientesActivos(1, LIMITE_CLIENTES);

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

          <section aria-labelledby="clientes-activos" className="space-y-3">
            <h2 id="clientes-activos" className="text-xl font-semibold">
              Clientes activos
            </h2>

            {clientes.length === 0 ? (
              <p>No hay clientes activos disponibles.</p>
            ) : (
              <>
                <p>
                  Primera página: mostrando {clientes.length} de {total} clientes
                  activos (hasta {LIMITE_CLIENTES} por página).
                </p>
                <ul className="divide-y divide-current/20 rounded-lg border border-current/20">
                  {clientes.map((cliente) => (
                    <li key={cliente.id} className="space-y-1 p-4">
                      <p className="font-medium">
                        {cliente.nombre} {cliente.apellido}
                      </p>
                      <p>DNI: {cliente.dni}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </ContenedorPagina>
    </main>
  );
}
