import Link from "next/link";

import { autorizarPagina } from "@/lib/authPagina";
import { listarSiniestros } from "@/lib/db/siniestro";
import { listadoSiniestrosQuerySchema } from "@/lib/schemas/siniestro";

export default async function SiniestrosPage() {
  const autorizacion = await autorizarPagina([
    "RECEPCIONISTA",
    "ENCARGADO_DEL_TALLER",
  ]);

  if (!autorizacion.autorizado) {
    return (
      <main className="mx-auto max-w-6xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Acceso denegado</h1>
        <p className="mt-3">No tenés permisos para consultar siniestros.</p>
      </main>
    );
  }

  const { page, limit } = listadoSiniestrosQuerySchema.parse({});
  const { siniestros, total } = await listarSiniestros(page, limit);

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-8">
      <h1 className="text-2xl font-bold">Siniestros</h1>

      {siniestros.length === 0 ? (
        <p className="mt-6 rounded-lg border border-current/20 p-6">
          No hay siniestros registrados.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm opacity-75">
            Mostrando {siniestros.length} de {total} siniestros.
          </p>
          <div className="mt-6 overflow-x-auto rounded-lg border border-current/20">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Listado de siniestros</caption>
              <thead className="border-b border-current/20 bg-current/5">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Número de siniestro
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Patente
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Aseguradora
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Grado de daño
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {siniestros.map((siniestro) => (
                  <tr
                    key={siniestro.id}
                    className="border-b border-current/10 last:border-b-0"
                  >
                    <th scope="row" className="px-4 py-3 font-medium">
                      <Link
                        href={`/siniestros/${siniestro.id}`}
                        className="rounded-sm text-blue-700 underline underline-offset-4 hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-blue-300"
                      >
                        {siniestro.numeroSiniestro}
                      </Link>
                    </th>
                    <td className="px-4 py-3">
                      {siniestro.cliente.nombre} {siniestro.cliente.apellido}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {siniestro.vehiculo.patente}
                    </td>
                    <td className="px-4 py-3">{siniestro.aseguradora.nombre}</td>
                    <td className="px-4 py-3">{siniestro.gradoDano}</td>
                    <td className="px-4 py-3">{siniestro.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
