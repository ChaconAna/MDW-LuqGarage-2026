import Link from "next/link";
import { redirect } from "next/navigation";
import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { autorizarPagina } from "@/lib/authPagina";
import { listarOrdenesTrabajo, listarOrdenesTrabajoFinalizadas } from "@/lib/db/ordenTrabajo";
import { listadoOrdenesTrabajoQuerySchema } from "@/lib/schemas/ordenTrabajo";
import { clasesEnlaceTexto } from "@/lib/utils";

export default async function OrdenesTrabajoPage({ searchParams }: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const autorizacion = await autorizarPagina(["ENCARGADO_DEL_TALLER", "MECANICO"]);
  if (!autorizacion.autorizado) return <main><ContenedorPagina ancho="narrow"><h1 className="text-2xl font-bold">Acceso denegado</h1><p>No tenés permisos para consultar órdenes de trabajo.</p></ContenedorPagina></main>;
  const { page } = await searchParams;
  const query = listadoOrdenesTrabajoQuerySchema.safeParse({ page, limit: 10 });
  if (Array.isArray(page) || !query.success) redirect("/ordenes-trabajo");
  const listar = autorizacion.usuario.rol === "MECANICO" ? listarOrdenesTrabajoFinalizadas : listarOrdenesTrabajo;
  const { ordenesTrabajo, total } = await listar(query.data.page, 10);
  const totalPaginas = Math.max(1, Math.ceil(total / 10));
  const hrefPagina = (pagina: number) => pagina === 1 ? "/ordenes-trabajo" : `/ordenes-trabajo?page=${pagina}`;
  if (query.data.page > totalPaginas) redirect(hrefPagina(totalPaginas));
  return <main><ContenedorPagina ancho="narrow"><div className="space-y-6">
    <h1 className="text-2xl font-bold">Órdenes de trabajo</h1>
    {autorizacion.usuario.rol === "MECANICO" ? <p>Se muestran únicamente órdenes FINALIZADAS.</p> : null}
    {total === 0 ? <p>No hay órdenes de trabajo disponibles.</p> : <ul className="space-y-4">
      {ordenesTrabajo.map((orden) => <li key={orden.id} className="min-w-0 break-words rounded-lg border border-current/20 p-4">
        <Link className={clasesEnlaceTexto} href={`/ordenes-trabajo/${orden.id}`}>Orden de trabajo {orden.id}</Link>
        <p>Siniestro {orden.siniestro.numeroSiniestro}</p><p>Estado: {orden.estado}</p>
      </li>)}
    </ul>}
    {total > 0 ? <nav aria-label="Paginación de órdenes de trabajo" className="flex flex-wrap items-center gap-4">
      {query.data.page > 1 ? <Link className={clasesEnlaceTexto} href={hrefPagina(query.data.page - 1)}>Anterior</Link> : <span aria-disabled="true">Anterior</span>}
      <span>Página {query.data.page} de {totalPaginas}</span>
      {query.data.page < totalPaginas ? <Link className={clasesEnlaceTexto} href={hrefPagina(query.data.page + 1)}>Siguiente</Link> : <span aria-disabled="true">Siguiente</span>}
    </nav> : null}
  </div></ContenedorPagina></main>;
}
