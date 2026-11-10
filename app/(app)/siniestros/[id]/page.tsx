import Link from "next/link";
import { notFound } from "next/navigation";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import SeccionDetalleSiniestro from "@/components/siniestros/SeccionDetalleSiniestro";
import PresupuestosSiniestro from "@/components/presupuestos/PresupuestosSiniestro";
import OrdenesTrabajoSiniestro from "@/components/ordenesTrabajo/OrdenesTrabajoSiniestro";
import { autorizarPagina } from "@/lib/authPagina";
import { obtenerSiniestroPorId } from "@/lib/db/siniestro";
import { clasesEnlaceTexto } from "@/lib/utils";
import {
  parametrosSiniestroSchema,
  type ParametrosSiniestro,
} from "@/lib/schemas/siniestro";

type SiniestroDetallePageProps = {
  params: Promise<ParametrosSiniestro>;
  searchParams: Promise<{ presupuestosPage?: string | string[]; ordenesPage?: string | string[] }>;
};

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

export default async function SiniestroDetallePage({
  params,
  searchParams,
}: SiniestroDetallePageProps) {
  const autorizacion = await autorizarPagina([
    "RECEPCIONISTA",
    "ENCARGADO_DEL_TALLER",
  ]);

  if (!autorizacion.autorizado) {
    return (
      <main>
        <ContenedorPagina ancho="narrow">
          <h1 className="text-2xl font-bold">Acceso denegado</h1>
          <p className="mt-3">No tenés permisos para consultar siniestros.</p>
        </ContenedorPagina>
      </main>
    );
  }

  const resultadoParametros = parametrosSiniestroSchema.safeParse(await params);

  if (!resultadoParametros.success) {
    notFound();
  }

  const siniestro = await obtenerSiniestroPorId(resultadoParametros.data.id);

  if (!siniestro) {
    notFound();
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

          <header>
            <h1 className="text-2xl font-bold">
              Siniestro {siniestro.numeroSiniestro}
            </h1>
            <p className="mt-1 text-sm opacity-75">Estado: {siniestro.estado}</p>
          </header>

          <PresupuestosSiniestro
            siniestroId={siniestro.id}
            rol={autorizacion.usuario.rol}
            paginaParametro={(await searchParams).presupuestosPage}
            ordenesPage={(await searchParams).ordenesPage}
          />

          {autorizacion.usuario.rol === "ENCARGADO_DEL_TALLER" ? <OrdenesTrabajoSiniestro
            siniestroId={siniestro.id}
            paginaParametro={(await searchParams).ordenesPage}
            presupuestosPage={(await searchParams).presupuestosPage}
          /> : null}

          <SeccionDetalleSiniestro
            idTitulo="datos-siniestro"
            titulo="Datos del siniestro"
          >
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm opacity-75">Fecha del siniestro</dt>
                <dd>{formateadorFecha.format(siniestro.fechaSiniestro)}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Fecha de registro</dt>
                <dd>{formateadorFecha.format(siniestro.fechaRegistro)}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Grado de daño</dt>
                <dd>{siniestro.gradoDano}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Número de póliza</dt>
                <dd>{siniestro.numeroPoliza}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs opacity-75">
              Fechas expresadas en hora de Buenos Aires.
            </p>
          </SeccionDetalleSiniestro>

          <SeccionDetalleSiniestro
            idTitulo="cliente-siniestro"
            titulo="Cliente"
          >
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm opacity-75">Nombre y apellido</dt>
                <dd>
                  {siniestro.cliente.nombre} {siniestro.cliente.apellido}
                </dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">DNI</dt>
                <dd>{siniestro.cliente.dni}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Estado del cliente</dt>
                <dd>{siniestro.cliente.activo ? "Activo" : "Inactivo"}</dd>
              </div>
            </dl>
          </SeccionDetalleSiniestro>

          <SeccionDetalleSiniestro
            idTitulo="vehiculo-siniestro"
            titulo="Vehículo"
          >
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm opacity-75">Patente</dt>
                <dd>{siniestro.vehiculo.patente}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Marca y modelo</dt>
                <dd>
                  {siniestro.vehiculo.modelo.marca.nombre}{" "}
                  {siniestro.vehiculo.modelo.nombre}
                </dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Tipo</dt>
                <dd>{siniestro.vehiculo.tipoVehiculo.nombre}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Estado del vehículo</dt>
                <dd>{siniestro.vehiculo.activo ? "Activo" : "Inactivo"}</dd>
              </div>
            </dl>
          </SeccionDetalleSiniestro>

          <SeccionDetalleSiniestro
            idTitulo="aseguradora-siniestro"
            titulo="Aseguradora"
          >
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm opacity-75">Nombre</dt>
                <dd>{siniestro.aseguradora.nombre}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">CUIT</dt>
                <dd>{siniestro.aseguradora.cuit}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Estado de la aseguradora</dt>
                <dd>{siniestro.aseguradora.activo ? "Activa" : "Inactiva"}</dd>
              </div>
            </dl>
          </SeccionDetalleSiniestro>

          <SeccionDetalleSiniestro
            idTitulo="documentos-siniestro"
            titulo="Documentos asociados"
          >
            {siniestro.documentos.length === 0 ? (
              <p className="mt-4">No hay documentos asociados.</p>
            ) : (
              <ul className="mt-4 list-inside list-disc space-y-1">
                {siniestro.documentos.map((documento) => (
                  <li key={documento.id}>{documento.tipo}</li>
                ))}
              </ul>
            )}
          </SeccionDetalleSiniestro>
        </div>
      </ContenedorPagina>
    </main>
  );
}
