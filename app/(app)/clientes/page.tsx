import Link from "next/link";
import { redirect } from "next/navigation";

import TablaClientes from "@/components/clientes/TablaClientes";
import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { autorizarPagina } from "@/lib/authPagina";
import { listarClientes } from "@/lib/db/cliente";
import { listadoClientesQuerySchema } from "@/lib/schemas/cliente";
import { clasesEnlaceTexto } from "@/lib/utils";

const LIMITE_CLIENTES = 10;

type ClientesPageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

function redirigirAPrimeraPagina(): never {
  redirect("/clientes");
}

function obtenerPaginaDesdeSearchParams(
  parametros: Awaited<ClientesPageProps["searchParams"]>,
) {
  const paginaParametro = parametros.page;

  if (paginaParametro !== undefined && typeof paginaParametro !== "string") {
    redirigirAPrimeraPagina();
  }

  const resultadoQuery = listadoClientesQuerySchema.safeParse({
    page: paginaParametro,
    limit: LIMITE_CLIENTES,
  });

  if (!resultadoQuery.success) {
    redirigirAPrimeraPagina();
  }

  return resultadoQuery.data.page;
}

export default async function ClientesPage({
  searchParams,
}: ClientesPageProps) {
  const autorizacion = await autorizarPagina([
    "RECEPCIONISTA",
    "ENCARGADO_DEL_TALLER",
  ]);

  if (!autorizacion.autorizado) {
    return (
      <main>
        <ContenedorPagina ancho="wide">
          <h1 className="text-2xl font-bold">Acceso denegado</h1>
          <p className="mt-3">No tenés permisos para consultar clientes.</p>
        </ContenedorPagina>
      </main>
    );
  }

  const page = obtenerPaginaDesdeSearchParams(await searchParams);
  const { clientes, total } = await listarClientes(page, LIMITE_CLIENTES);
  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE_CLIENTES));

  if (page > totalPaginas) {
    redirect(
      totalPaginas === 1 ? "/clientes" : `/clientes?page=${totalPaginas}`,
    );
  }

  return (
    <main>
      <ContenedorPagina ancho="wide">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Link
          href="/clientes/nuevo"
          className={`${clasesEnlaceTexto} mt-4 inline-block`}
        >
          Registrar cliente
        </Link>

        {clientes.length === 0 ? (
          <p className="mt-6 rounded-lg border border-current/20 p-6">
            No hay clientes registrados.
          </p>
        ) : (
          <TablaClientes
            clientes={clientes}
            pagina={page}
            totalPaginas={totalPaginas}
            total={total}
          />
        )}
      </ContenedorPagina>
    </main>
  );
}
