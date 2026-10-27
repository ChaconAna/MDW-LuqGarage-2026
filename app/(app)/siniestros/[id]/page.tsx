import Link from "next/link";
import { notFound } from "next/navigation";

import { autorizarPagina } from "@/lib/authPagina";
import { obtenerSiniestroPorId } from "@/lib/db/siniestro";
import {
  parametrosSiniestroSchema,
  type ParametrosSiniestro,
} from "@/lib/schemas/siniestro";

type SiniestroDetallePageProps = {
  params: Promise<ParametrosSiniestro>;
};

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

export default async function SiniestroDetallePage({
  params,
}: SiniestroDetallePageProps) {
  const autorizacion = await autorizarPagina([
    "RECEPCIONISTA",
    "ENCARGADO_DEL_TALLER",
  ]);

  if (!autorizacion.autorizado) {
    return (
      <main className="mx-auto max-w-4xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Acceso denegado</h1>
        <p className="mt-3">No tenés permisos para consultar siniestros.</p>
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
    <main className="mx-auto max-w-4xl space-y-6 p-6 sm:p-8">
      <Link
        href="/siniestros"
        className="inline-block text-sm underline underline-offset-4 hover:opacity-75"
      >
        Volver a siniestros
      </Link>

      <header>
        <h1 className="text-2xl font-bold">
          Siniestro {siniestro.numeroSiniestro}
        </h1>
        <p className="mt-1 text-sm opacity-75">Estado: {siniestro.estado}</p>
      </header>

      <section
        aria-labelledby="datos-siniestro"
        className="rounded-lg border border-current/20 p-5"
      >
        <h2 id="datos-siniestro" className="text-lg font-semibold">
          Datos del siniestro
        </h2>
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
      </section>

      <section
        aria-labelledby="cliente-siniestro"
        className="rounded-lg border border-current/20 p-5"
      >
        <h2 id="cliente-siniestro" className="text-lg font-semibold">
          Cliente
        </h2>
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
      </section>

      <section
        aria-labelledby="vehiculo-siniestro"
        className="rounded-lg border border-current/20 p-5"
      >
        <h2 id="vehiculo-siniestro" className="text-lg font-semibold">
          Vehículo
        </h2>
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
      </section>

      <section
        aria-labelledby="aseguradora-siniestro"
        className="rounded-lg border border-current/20 p-5"
      >
        <h2 id="aseguradora-siniestro" className="text-lg font-semibold">
          Aseguradora
        </h2>
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
      </section>

      <section
        aria-labelledby="documentos-siniestro"
        className="rounded-lg border border-current/20 p-5"
      >
        <h2 id="documentos-siniestro" className="text-lg font-semibold">
          Documentos asociados
        </h2>
        {siniestro.documentos.length === 0 ? (
          <p className="mt-4">No hay documentos asociados.</p>
        ) : (
          <ul className="mt-4 list-inside list-disc space-y-1">
            {siniestro.documentos.map((documento) => (
              <li key={documento.id}>{documento.tipo}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
