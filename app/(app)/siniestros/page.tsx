import { redirect } from "next/navigation";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import TablaSiniestros from "@/components/siniestros/TablaSiniestros";
import { autorizarPagina } from "@/lib/authPagina";
import { listarSiniestros } from "@/lib/db/siniestro";
import { listadoSiniestrosQuerySchema } from "@/lib/schemas/siniestro";

const LIMITE_SINIESTROS = 10;

type SiniestrosPageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

function redirigirAPrimeraPagina(): never {
  redirect("/siniestros");
}

function obtenerPaginaDesdeSearchParams(
  parametros: Awaited<SiniestrosPageProps["searchParams"]>,
) {
  const paginaParametro = parametros.page;

  if (paginaParametro !== undefined && typeof paginaParametro !== "string") {
    redirigirAPrimeraPagina();
  }

  const resultadoQuery = listadoSiniestrosQuerySchema.safeParse({
    page: paginaParametro,
    limit: LIMITE_SINIESTROS,
  });

  if (!resultadoQuery.success) {
    redirigirAPrimeraPagina();
  }

  return resultadoQuery.data.page;
}

export default async function SiniestrosPage({
  searchParams,
}: SiniestrosPageProps) {
  const autorizacion = await autorizarPagina([
    "RECEPCIONISTA",
    "ENCARGADO_DEL_TALLER",
  ]);

  if (!autorizacion.autorizado) {
    return (
      <main>
        <ContenedorPagina ancho="wide">
          <h1 className="text-2xl font-bold">Acceso denegado</h1>
          <p className="mt-3">No tenés permisos para consultar siniestros.</p>
        </ContenedorPagina>
      </main>
    );
  }

  const page = obtenerPaginaDesdeSearchParams(await searchParams);
  const { siniestros, total } = await listarSiniestros(
    page,
    LIMITE_SINIESTROS,
  );
  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE_SINIESTROS));

  if (page > totalPaginas) {
    redirect(
      totalPaginas === 1
        ? "/siniestros"
        : `/siniestros?page=${totalPaginas}`,
    );
  }

  return (
    <main>
      <ContenedorPagina ancho="wide">
        <h1 className="text-2xl font-bold">Siniestros</h1>

        {siniestros.length === 0 ? (
          <p className="mt-6 rounded-lg border border-current/20 p-6">
            No hay siniestros registrados.
          </p>
        ) : (
          <TablaSiniestros
            key={page}
            siniestros={siniestros.map((siniestro) => ({
              id: siniestro.id,
              numeroSiniestro: siniestro.numeroSiniestro,
              cliente: `${siniestro.cliente.nombre} ${siniestro.cliente.apellido}`,
              patente: siniestro.vehiculo.patente,
              aseguradora: siniestro.aseguradora.nombre,
              gradoDano: siniestro.gradoDano,
              estado: siniestro.estado,
            }))}
            pagina={page}
            totalPaginas={totalPaginas}
            total={total}
          />
        )}
      </ContenedorPagina>
    </main>
  );
}
