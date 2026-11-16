import Link from "next/link";
import { notFound } from "next/navigation";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { autorizarPagina } from "@/lib/authPagina";
import { obtenerClientePorId } from "@/lib/db/cliente";
import {
  parametrosClienteSchema,
  type ParametrosCliente,
} from "@/lib/schemas/cliente";
import { clasesEnlaceTexto } from "@/lib/utils";

type ClienteDetallePageProps = {
  params: Promise<ParametrosCliente>;
};

export default async function ClienteDetallePage({
  params,
}: ClienteDetallePageProps) {
  const autorizacion = await autorizarPagina([
    "RECEPCIONISTA",
    "ENCARGADO_DEL_TALLER",
  ]);

  if (!autorizacion.autorizado) {
    return (
      <main>
        <ContenedorPagina ancho="narrow">
          <h1 className="text-2xl font-bold">Acceso denegado</h1>
          <p className="mt-3">No tenés permisos para consultar clientes.</p>
        </ContenedorPagina>
      </main>
    );
  }

  const resultadoParametros = parametrosClienteSchema.safeParse(await params);

  if (!resultadoParametros.success) {
    notFound();
  }

  const cliente = await obtenerClientePorId(resultadoParametros.data.id);

  if (!cliente) {
    notFound();
  }

  return (
    <main>
      <ContenedorPagina ancho="narrow">
        <div className="min-w-0 space-y-6">
          <Link
            href="/clientes"
            className={`${clasesEnlaceTexto} inline-block text-sm`}
          >
            Volver a clientes
          </Link>

          <header>
            <h1 className="break-words text-2xl font-bold">
              {cliente.nombre} {cliente.apellido}
            </h1>
            <p className="mt-1 text-sm opacity-75">
              Estado: {cliente.activo ? "Activo" : "Inactivo"}
            </p>
          </header>

          <Link
            href={`/clientes/${cliente.id}/editar`}
            className={clasesEnlaceTexto}
          >
            Editar
          </Link>

          <section
            aria-labelledby="datos-cliente"
            className="rounded-lg border border-current/20 p-5"
          >
            <h2 id="datos-cliente" className="text-lg font-semibold">
              Datos del cliente
            </h2>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm opacity-75">Nombre</dt>
                <dd className="break-words">{cliente.nombre}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Apellido</dt>
                <dd className="break-words">{cliente.apellido}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">DNI</dt>
                <dd className="break-words">{cliente.dni}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Teléfono</dt>
                <dd className="break-words">{cliente.telefono}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Email</dt>
                <dd className="break-words">{cliente.email}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Dirección</dt>
                <dd className="break-words">{cliente.direccion}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Localidad</dt>
                <dd className="break-words">{cliente.localidad.nombre}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Provincia</dt>
                <dd className="break-words">
                  {cliente.localidad.provincia.nombre}
                </dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Estado</dt>
                <dd>{cliente.activo ? "Activo" : "Inactivo"}</dd>
              </div>
            </dl>
          </section>
        </div>
      </ContenedorPagina>
    </main>
  );
}
