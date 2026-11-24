import { redirect } from "next/navigation";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import TablaPresupuestos from "@/components/presupuestos/TablaPresupuestos";
import { autorizarPagina } from "@/lib/authPagina";
import { listarPresupuestos } from "@/lib/db/presupuesto";
import { listadoPresupuestosQuerySchema } from "@/lib/schemas/presupuesto";

const LIMITE_PRESUPUESTOS = 10;

type PresupuestosPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PresupuestosPage({ searchParams }: PresupuestosPageProps) {
  const autorizacion = await autorizarPagina([
    "RECEPCIONISTA",
    "ENCARGADO_DEL_TALLER",
  ]);

  if (!autorizacion.autorizado) {
    return (
      <main>
        <ContenedorPagina ancho="wide">
          <h1 className="text-2xl font-bold">Acceso denegado</h1>
          <p className="mt-3">No tenés permisos para consultar presupuestos.</p>
        </ContenedorPagina>
      </main>
    );
  }

  const parametros = await searchParams;
  if (parametros.page !== undefined && typeof parametros.page !== "string") {
    redirect("/presupuestos");
  }
  const resultadoQuery = listadoPresupuestosQuerySchema.safeParse({
    page: parametros.page,
    limit: LIMITE_PRESUPUESTOS,
  });
  if (!resultadoQuery.success) redirect("/presupuestos");

  const { page, limit } = resultadoQuery.data;
  const { presupuestos, total } = await listarPresupuestos(page, limit);
  const totalPaginas = Math.max(1, Math.ceil(total / limit));
  if (page > totalPaginas) {
    redirect(totalPaginas === 1 ? "/presupuestos" : `/presupuestos?page=${totalPaginas}`);
  }

  return (
    <main>
      <ContenedorPagina ancho="wide">
        <h1 className="text-2xl font-bold">Presupuestos</h1>
        <p className="mt-3 text-muted-foreground">
          Consultá los presupuestos registrados y el siniestro al que pertenece cada uno.
        </p>
        {presupuestos.length === 0 ? (
          <p className="mt-6 rounded-lg border border-current/20 p-6">
            No hay presupuestos registrados.
          </p>
        ) : (
          <TablaPresupuestos
            presupuestos={presupuestos}
            pagina={page}
            totalPaginas={totalPaginas}
            total={total}
          />
        )}
      </ContenedorPagina>
    </main>
  );
}
