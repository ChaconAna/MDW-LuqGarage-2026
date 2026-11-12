import Link from "next/link";
import { redirect } from "next/navigation";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import FormularioRegistroSiniestro from "@/components/siniestros/FormularioRegistroSiniestro";
import NavegacionSelectores, {
  type SeleccionesValidas,
} from "@/components/siniestros/NavegacionSelectores";
import SelectorAseguradoraActiva from "@/components/siniestros/SelectorAseguradoraActiva";
import SelectorClienteActivo from "@/components/siniestros/SelectorClienteActivo";
import SelectorVehiculoActivo from "@/components/siniestros/SelectorVehiculoActivo";
import { autorizarPagina } from "@/lib/authPagina";
import {
  listarAseguradorasActivas,
  obtenerAseguradoraPorId,
} from "@/lib/db/aseguradora";
import { listarClientesActivos, obtenerClientePorId } from "@/lib/db/cliente";
import { listarVehiculosActivos, obtenerVehiculoPorId } from "@/lib/db/vehiculo";
import {
  listadoAseguradorasQuerySchema,
  parametrosAseguradoraSchema,
} from "@/lib/schemas/aseguradora";
import {
  listadoClientesQuerySchema,
  parametrosClienteSchema,
} from "@/lib/schemas/cliente";
import {
  listadoVehiculosQuerySchema,
  parametrosVehiculoSchema,
} from "@/lib/schemas/vehiculo";
import { clasesEnlaceTexto } from "@/lib/utils";

const LIMITE_CLIENTES = 10;
const LIMITE_VEHICULOS = 10;
const LIMITE_ASEGURADORAS = 10;

type SiniestroNuevoPageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

function hrefPaginas(
  paginaClientes: number,
  paginaVehiculos: number,
  paginaAseguradoras: number,
  seleccionesValidas: SeleccionesValidas,
) {
  const parametros = new URLSearchParams();

  if (paginaClientes !== 1) {
    parametros.set("clientesPage", String(paginaClientes));
  }
  if (paginaVehiculos !== 1) {
    parametros.set("vehiculosPage", String(paginaVehiculos));
  }
  if (paginaAseguradoras !== 1) {
    parametros.set("aseguradorasPage", String(paginaAseguradoras));
  }
  for (const [clave, id] of Object.entries(seleccionesValidas)) {
    if (id) parametros.set(clave, id);
  }

  const query = parametros.toString();
  return query ? `/siniestros/nuevo?${query}` : "/siniestros/nuevo";
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
  let clienteSeleccionado: Awaited<
    ReturnType<typeof listarClientesActivos>
  >["clientes"][number] | null = null;
  let errorSeleccion: string | undefined;

  if (parametros.clienteId !== undefined) {
    const resultadoCliente = parametrosClienteSchema.safeParse({
      id: parametros.clienteId,
    });

    if (!resultadoCliente.success) {
      errorSeleccion = "La selección de cliente no es válida. Elegí un cliente activo.";
    } else {
      const cliente = await obtenerClientePorId(resultadoCliente.data.id);

      if (!cliente || !cliente.activo) {
        errorSeleccion =
          "El cliente seleccionado no existe o ya no está activo. Elegí un cliente activo.";
      } else {
        clienteSeleccionado = {
          id: cliente.id,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          dni: cliente.dni,
        };
      }
    }
  }

  let vehiculoSeleccionado: Awaited<
    ReturnType<typeof listarVehiculosActivos>
  >["vehiculos"][number] | null = null;
  let errorSeleccionVehiculo: string | undefined;

  if (parametros.vehiculoId !== undefined) {
    const resultadoVehiculo = parametrosVehiculoSchema.safeParse({
      id: parametros.vehiculoId,
    });

    if (!resultadoVehiculo.success) {
      errorSeleccionVehiculo =
        "La selección de vehículo no es válida. Elegí un vehículo activo.";
    } else {
      const vehiculo = await obtenerVehiculoPorId(resultadoVehiculo.data.id);
      if (!vehiculo || !vehiculo.activo) {
        errorSeleccionVehiculo =
          "El vehículo seleccionado no existe o ya no está activo. Elegí un vehículo activo.";
      } else {
        vehiculoSeleccionado = {
          id: vehiculo.id,
          patente: vehiculo.patente,
          modelo: {
            nombre: vehiculo.modelo.nombre,
            marca: { nombre: vehiculo.modelo.marca.nombre },
          },
        };
      }
    }
  }

  let aseguradoraSeleccionada: Awaited<
    ReturnType<typeof listarAseguradorasActivas>
  >["aseguradoras"][number] | null = null;
  let errorSeleccionAseguradora: string | undefined;

  if (parametros.aseguradoraId !== undefined) {
    const resultadoAseguradora = parametrosAseguradoraSchema.safeParse({
      id: parametros.aseguradoraId,
    });

    if (!resultadoAseguradora.success) {
      errorSeleccionAseguradora =
        "La selección de aseguradora no es válida. Elegí una aseguradora activa.";
    } else {
      const aseguradora = await obtenerAseguradoraPorId(resultadoAseguradora.data.id);
      if (!aseguradora || !aseguradora.activo) {
        errorSeleccionAseguradora =
          "La aseguradora seleccionada no existe o ya no está activa. Elegí una aseguradora activa.";
      } else {
        aseguradoraSeleccionada = {
          id: aseguradora.id,
          nombre: aseguradora.nombre,
          cuit: aseguradora.cuit,
        };
      }
    }
  }

  const seleccionesValidas: SeleccionesValidas = {
    clienteId: clienteSeleccionado?.id,
    vehiculoId: vehiculoSeleccionado?.id,
    aseguradoraId: aseguradoraSeleccionada?.id,
  };

  const resultadoClientesQuery =
    parametros.clientesPage === undefined ||
    typeof parametros.clientesPage === "string"
      ? listadoClientesQuerySchema.safeParse({
          page: parametros.clientesPage,
          limit: LIMITE_CLIENTES,
        })
      : null;
  const resultadoVehiculosQuery =
    parametros.vehiculosPage === undefined ||
    typeof parametros.vehiculosPage === "string"
      ? listadoVehiculosQuerySchema.safeParse({
          page: parametros.vehiculosPage,
          limit: LIMITE_VEHICULOS,
        })
      : null;
  const resultadoAseguradorasQuery =
    parametros.aseguradorasPage === undefined ||
    typeof parametros.aseguradorasPage === "string"
      ? listadoAseguradorasQuerySchema.safeParse({
          page: parametros.aseguradorasPage,
          limit: LIMITE_ASEGURADORAS,
        })
      : null;
  const paginaAseguradorasSolicitada = resultadoAseguradorasQuery?.success
    ? resultadoAseguradorasQuery.data.page
    : 1;
  const paginaClientesSolicitada = resultadoClientesQuery?.success
    ? resultadoClientesQuery.data.page
    : 1;
  const paginaVehiculosSolicitada = resultadoVehiculosQuery?.success
    ? resultadoVehiculosQuery.data.page
    : 1;

  const [primeraPaginaClientes, primeraPaginaVehiculos, primeraPaginaAseguradoras] =
    await Promise.all([
      listarClientesActivos(1, LIMITE_CLIENTES),
      listarVehiculosActivos(1, LIMITE_VEHICULOS),
      listarAseguradorasActivas(1, LIMITE_ASEGURADORAS),
    ]);
  const total = primeraPaginaClientes.total;
  const totalVehiculos = primeraPaginaVehiculos.total;
  const totalAseguradoras = primeraPaginaAseguradoras.total;
  const totalPaginasClientes = Math.max(1, Math.ceil(total / LIMITE_CLIENTES));
  const totalPaginasVehiculos = Math.max(
    1,
    Math.ceil(totalVehiculos / LIMITE_VEHICULOS),
  );
  const totalPaginasAseguradoras = Math.max(
    1,
    Math.ceil(totalAseguradoras / LIMITE_ASEGURADORAS),
  );
  const paginaAseguradoras = Math.min(
    paginaAseguradorasSolicitada,
    totalPaginasAseguradoras,
  );
  const paginaClientes = Math.min(paginaClientesSolicitada, totalPaginasClientes);
  const paginaVehiculos = Math.min(paginaVehiculosSolicitada, totalPaginasVehiculos);

  if (
    !resultadoClientesQuery?.success ||
    !resultadoVehiculosQuery?.success ||
    !resultadoAseguradorasQuery?.success ||
    paginaClientes !== paginaClientesSolicitada ||
    paginaVehiculos !== paginaVehiculosSolicitada ||
    paginaAseguradoras !== paginaAseguradorasSolicitada
  ) {
    redirect(
      hrefPaginas(
        paginaClientes,
        paginaVehiculos,
        paginaAseguradoras,
        seleccionesValidas,
      ),
    );
  }

  const { clientes } =
    paginaClientes === 1
      ? primeraPaginaClientes
      : await listarClientesActivos(paginaClientes, LIMITE_CLIENTES);
  const { vehiculos } =
    paginaVehiculos === 1
      ? primeraPaginaVehiculos
      : await listarVehiculosActivos(paginaVehiculos, LIMITE_VEHICULOS);
  const { aseguradoras } =
    paginaAseguradoras === 1
      ? primeraPaginaAseguradoras
      : await listarAseguradorasActivas(paginaAseguradoras, LIMITE_ASEGURADORAS);

  return (
    <main>
      <ContenedorPagina ancho="narrow">
        <NavegacionSelectores seleccionesValidas={seleccionesValidas}>
          <div className="space-y-6">
            <Link
              href="/siniestros"
              className={`${clasesEnlaceTexto} inline-block text-sm`}
            >
              Volver a siniestros
            </Link>

            <h1 className="text-2xl font-bold">Registrar siniestro</h1>
            <FormularioRegistroSiniestro
              seleccionesValidas={seleccionesValidas}
              selectorCliente={
                <section aria-labelledby="clientes-activos" className="space-y-3">
                  <h2 id="clientes-activos" className="text-xl font-semibold">
                    Clientes activos
                  </h2>
                  <SelectorClienteActivo
                    clientes={clientes}
                    clienteSeleccionado={clienteSeleccionado}
                    errorSeleccion={errorSeleccion}
                    pagina={paginaClientes}
                    totalPaginas={totalPaginasClientes}
                    total={total}
                    limite={LIMITE_CLIENTES}
                  />
                </section>
              }
              selectorVehiculo={
                <section aria-labelledby="vehiculos-activos" className="space-y-3">
                  <h2 id="vehiculos-activos" className="text-xl font-semibold">
                    Vehículos activos
                  </h2>
                  <SelectorVehiculoActivo
                    vehiculos={vehiculos}
                    vehiculoSeleccionado={vehiculoSeleccionado}
                    errorSeleccion={errorSeleccionVehiculo}
                    pagina={paginaVehiculos}
                    totalPaginas={totalPaginasVehiculos}
                    total={totalVehiculos}
                    limite={LIMITE_VEHICULOS}
                  />
                </section>
              }
              selectorAseguradora={
                <section aria-labelledby="aseguradoras-activas" className="space-y-3">
                  <h2 id="aseguradoras-activas" className="text-xl font-semibold">
                    Aseguradoras activas
                  </h2>
                  <SelectorAseguradoraActiva
                    aseguradoras={aseguradoras}
                    aseguradoraSeleccionada={aseguradoraSeleccionada}
                    errorSeleccion={errorSeleccionAseguradora}
                    pagina={paginaAseguradoras}
                    totalPaginas={totalPaginasAseguradoras}
                    total={totalAseguradoras}
                    limite={LIMITE_ASEGURADORAS}
                  />
                </section>
              }
            />
          </div>
        </NavegacionSelectores>
      </ContenedorPagina>
    </main>
  );
}
