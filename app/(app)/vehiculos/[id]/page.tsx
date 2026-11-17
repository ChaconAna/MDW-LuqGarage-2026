import Link from "next/link";
import { notFound } from "next/navigation";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { autorizarPagina } from "@/lib/authPagina";
import { obtenerVehiculoPorId } from "@/lib/db/vehiculo";
import { parametrosVehiculoSchema, type ParametrosVehiculo } from "@/lib/schemas/vehiculo";
import { clasesEnlaceTexto } from "@/lib/utils";

type VehiculoDetallePageProps = {
  params: Promise<ParametrosVehiculo>;
};

export default async function VehiculoDetallePage({ params }: VehiculoDetallePageProps) {
  const autorizacion = await autorizarPagina([
    "RECEPCIONISTA",
    "ENCARGADO_DEL_TALLER",
  ]);
  if (!autorizacion.autorizado) {
    return (
      <main>
        <ContenedorPagina ancho="narrow">
          <h1 className="text-2xl font-bold">Acceso denegado</h1>
          <p className="mt-3">No tenés permisos para consultar vehículos.</p>
        </ContenedorPagina>
      </main>
    );
  }

  const resultadoParametros = parametrosVehiculoSchema.safeParse(await params);
  if (!resultadoParametros.success) notFound();

  const vehiculo = await obtenerVehiculoPorId(resultadoParametros.data.id);
  if (!vehiculo) notFound();

  return (
    <main>
      <ContenedorPagina ancho="narrow">
        <div className="min-w-0 space-y-6">
          <Link href="/vehiculos" className={`${clasesEnlaceTexto} inline-block text-sm`}>
            Volver a vehículos
          </Link>
          <header>
            <h1 className="break-words text-2xl font-bold">Vehículo {vehiculo.patente}</h1>
            <p className="mt-1 text-sm opacity-75">Estado: {vehiculo.activo ? "Activo" : "Inactivo"}</p>
          </header>
          <Link href={`/vehiculos/${vehiculo.id}/editar`} className={clasesEnlaceTexto}>Editar</Link>
          <section aria-labelledby="datos-vehiculo" className="rounded-lg border border-current/20 p-5">
            <h2 id="datos-vehiculo" className="text-lg font-semibold">Datos del vehículo</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm opacity-75">ID</dt>
                <dd className="break-words">{vehiculo.id}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Patente</dt>
                <dd className="break-words">{vehiculo.patente}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Marca</dt>
                <dd className="break-words">{vehiculo.modelo.marca.nombre}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Modelo</dt>
                <dd className="break-words">{vehiculo.modelo.nombre}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Tipo de vehículo</dt>
                <dd className="break-words">{vehiculo.tipoVehiculo.nombre}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Estado</dt>
                <dd>{vehiculo.activo ? "Activo" : "Inactivo"}</dd>
              </div>
            </dl>
          </section>
        </div>
      </ContenedorPagina>
    </main>
  );
}
