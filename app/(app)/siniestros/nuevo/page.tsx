import Link from "next/link";
import { redirect } from "next/navigation";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { Button } from "@/components/ui/button";
import { autorizarPagina } from "@/lib/authPagina";
import { listarAseguradorasActivas } from "@/lib/db/aseguradora";
import { listarClientesActivos } from "@/lib/db/cliente";
import { listarVehiculosActivos } from "@/lib/db/vehiculo";
import { listadoClientesQuerySchema } from "@/lib/schemas/cliente";
import { clasesEnlaceTexto } from "@/lib/utils";

const LIMITE_CLIENTES = 10;
const LIMITE_VEHICULOS = 10;
const LIMITE_ASEGURADORAS = 10;

type SiniestroNuevoPageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

function hrefPaginaClientes(pagina: number) {
  return pagina === 1
    ? "/siniestros/nuevo"
    : `/siniestros/nuevo?clientesPage=${pagina}`;
}

export default async function SiniestroNuevoPage({
  searchParams,
}: SiniestroNuevoPageProps) {
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

  const parametros = await searchParams;
  const paginaParametro = parametros.clientesPage;

  if (paginaParametro !== undefined && typeof paginaParametro !== "string") {
    redirect(hrefPaginaClientes(1));
  }

  const resultadoQuery = listadoClientesQuerySchema.safeParse({
    page: paginaParametro,
    limit: LIMITE_CLIENTES,
  });

  if (!resultadoQuery.success) {
    redirect(hrefPaginaClientes(1));
  }

  const paginaClientes = resultadoQuery.data.page;
  const primeraPagina = await listarClientesActivos(1, LIMITE_CLIENTES);
  const total = primeraPagina.total;
  const totalPaginasClientes = Math.max(1, Math.ceil(total / LIMITE_CLIENTES));

  if (paginaClientes > totalPaginasClientes) {
    redirect(hrefPaginaClientes(totalPaginasClientes));
  }

  const { clientes } =
    paginaClientes === 1
      ? primeraPagina
      : await listarClientesActivos(paginaClientes, LIMITE_CLIENTES);
  const { vehiculos, total: totalVehiculos } = await listarVehiculosActivos(
    1,
    LIMITE_VEHICULOS,
  );
  const { aseguradoras, total: totalAseguradoras } =
    await listarAseguradorasActivas(1, LIMITE_ASEGURADORAS);

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
                  Mostrando {clientes.length} de {total} clientes
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
            <nav
              aria-label="Paginación de clientes activos"
              className="flex flex-wrap items-center gap-3"
            >
              {paginaClientes > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={hrefPaginaClientes(paginaClientes - 1)}
                    aria-label={`Ir a la página ${paginaClientes - 1} de clientes activos`}
                  >
                    Anterior
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  aria-label="Página anterior de clientes activos no disponible"
                >
                  Anterior
                </Button>
              )}

              <span aria-current="page" className="text-sm">
                Página {paginaClientes} de {totalPaginasClientes}
              </span>

              {paginaClientes < totalPaginasClientes ? (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={hrefPaginaClientes(paginaClientes + 1)}
                    aria-label={`Ir a la página ${paginaClientes + 1} de clientes activos`}
                  >
                    Siguiente
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  aria-label="Página siguiente de clientes activos no disponible"
                >
                  Siguiente
                </Button>
              )}
            </nav>
          </section>

          <section aria-labelledby="vehiculos-activos" className="space-y-3">
            <h2 id="vehiculos-activos" className="text-xl font-semibold">
              Vehículos activos
            </h2>

            {vehiculos.length === 0 ? (
              <p>No hay vehículos activos disponibles.</p>
            ) : (
              <>
                <p>
                  Primera página: mostrando {vehiculos.length} de {totalVehiculos}{" "}
                  vehículos activos (hasta {LIMITE_VEHICULOS} por página).
                </p>
                <ul className="divide-y divide-current/20 rounded-lg border border-current/20">
                  {vehiculos.map((vehiculo) => (
                    <li key={vehiculo.id} className="space-y-1 p-4">
                      <p className="font-medium">Patente: {vehiculo.patente}</p>
                      <p>Marca: {vehiculo.modelo.marca.nombre}</p>
                      <p>Modelo: {vehiculo.modelo.nombre}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section aria-labelledby="aseguradoras-activas" className="space-y-3">
            <h2 id="aseguradoras-activas" className="text-xl font-semibold">
              Aseguradoras activas
            </h2>

            {aseguradoras.length === 0 ? (
              <p>No hay aseguradoras activas disponibles.</p>
            ) : (
              <>
                <p>
                  Primera página: mostrando {aseguradoras.length} de{" "}
                  {totalAseguradoras} aseguradoras activas (hasta{" "}
                  {LIMITE_ASEGURADORAS} por página).
                </p>
                <ul className="divide-y divide-current/20 rounded-lg border border-current/20">
                  {aseguradoras.map((aseguradora) => (
                    <li key={aseguradora.id} className="space-y-1 p-4">
                      <p className="font-medium">{aseguradora.nombre}</p>
                      <p>CUIT: {aseguradora.cuit}</p>
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
