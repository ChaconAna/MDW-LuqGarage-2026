import { redirect } from "next/navigation";
import Link from "next/link";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import TablaVehiculos from "@/components/vehiculos/TablaVehiculos";
import { autorizarPagina } from "@/lib/authPagina";
import { listarVehiculos } from "@/lib/db/vehiculo";
import { listadoVehiculosQuerySchema } from "@/lib/schemas/vehiculo";
import { clasesEnlaceTexto } from "@/lib/utils";

const LIMITE_VEHICULOS = 10;

type VehiculosPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VehiculosPage({ searchParams }: VehiculosPageProps) {
  const autorizacion = await autorizarPagina([
    "RECEPCIONISTA",
    "ENCARGADO_DEL_TALLER",
  ]);

  if (!autorizacion.autorizado) {
    return (
      <main>
        <ContenedorPagina ancho="wide">
          <h1 className="text-2xl font-bold">Acceso denegado</h1>
          <p className="mt-3">No tenés permisos para consultar vehículos.</p>
        </ContenedorPagina>
      </main>
    );
  }

  const parametros = await searchParams;
  if (parametros.page !== undefined && typeof parametros.page !== "string") {
    redirect("/vehiculos");
  }
  const resultadoQuery = listadoVehiculosQuerySchema.safeParse({
    page: parametros.page,
    limit: LIMITE_VEHICULOS,
  });
  if (!resultadoQuery.success) redirect("/vehiculos");

  const { page, limit } = resultadoQuery.data;
  const { vehiculos, total } = await listarVehiculos(page, limit);
  const totalPaginas = Math.max(1, Math.ceil(total / limit));
  if (page > totalPaginas) {
    redirect(totalPaginas === 1 ? "/vehiculos" : `/vehiculos?page=${totalPaginas}`);
  }

  return (
    <main>
      <ContenedorPagina ancho="wide">
        <h1 className="text-2xl font-bold">Vehículos</h1>
        <Link href="/vehiculos/nuevo" className={`${clasesEnlaceTexto} mt-4 inline-block`}>Registrar vehículo</Link>
        {vehiculos.length === 0 ? (
          <p className="mt-6 rounded-lg border border-current/20 p-6">
            No hay vehículos registrados.
          </p>
        ) : (
          <TablaVehiculos
            vehiculos={vehiculos}
            pagina={page}
            totalPaginas={totalPaginas}
            total={total}
          />
        )}
      </ContenedorPagina>
    </main>
  );
}
