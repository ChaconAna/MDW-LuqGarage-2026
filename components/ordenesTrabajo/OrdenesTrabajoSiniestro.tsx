import Link from "next/link";
import { redirect } from "next/navigation";
import { listarOrdenesTrabajoPorSiniestro } from "@/lib/db/ordenTrabajo";
import { listarPresupuestosAprobadosDisponibles } from "@/lib/db/presupuesto";
import { listadoOrdenesTrabajoQuerySchema } from "@/lib/schemas/ordenTrabajo";
import { listadoPresupuestosQuerySchema } from "@/lib/schemas/presupuesto";
import { clasesEnlaceTexto } from "@/lib/utils";

export default async function OrdenesTrabajoSiniestro({ siniestroId, paginaParametro, presupuestosPage }: {
  siniestroId: string;
  paginaParametro?: string | string[];
  presupuestosPage?: string | string[];
}) {
  const base = `/siniestros/${siniestroId}`;
  const independiente = listadoPresupuestosQuerySchema.safeParse({ page: presupuestosPage, limit: 10 });
  const hrefPagina = (pagina: number) => {
    const query = new URLSearchParams();
    if (typeof presupuestosPage === "string" && independiente.success && independiente.data.page > 1) query.set("presupuestosPage", String(independiente.data.page));
    if (pagina > 1) query.set("ordenesPage", String(pagina));
    return query.size ? `${base}?${query}` : base;
  };
  const query = listadoOrdenesTrabajoQuerySchema.safeParse({ page: paginaParametro, limit: 10 });
  if (Array.isArray(paginaParametro) || !query.success) redirect(hrefPagina(1));
  const [{ ordenesTrabajo, total }, disponibles] = await Promise.all([
    listarOrdenesTrabajoPorSiniestro(siniestroId, query.data.page, 10),
    listarPresupuestosAprobadosDisponibles(siniestroId, 1, 1),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(total / 10));
  if (query.data.page > totalPaginas) redirect(hrefPagina(totalPaginas));
  return <section aria-labelledby="ordenes-siniestro" className="min-w-0 space-y-4 rounded-lg border border-current/20 p-4">
    <h2 id="ordenes-siniestro" className="text-xl font-semibold">Órdenes de trabajo asociadas</h2>
    {disponibles.total > 0 ? <Link href={`${base}/ordenes-trabajo/nueva`} className={clasesEnlaceTexto}>Crear orden de trabajo</Link> : <p>Para crear una orden necesitás presupuestos aprobados disponibles.</p>}
    {total === 0 ? <p>No hay órdenes de trabajo asociadas.</p> : <ul className="space-y-3">{ordenesTrabajo.map((orden) => <li key={orden.id} className="break-words">
      <Link href={`/ordenes-trabajo/${orden.id}`} className={clasesEnlaceTexto}>Orden de trabajo {orden.id}</Link><p>Estado: {orden.estado}</p>
    </li>)}</ul>}
    {total > 0 ? <nav aria-label="Paginación de órdenes del siniestro" className="flex flex-wrap items-center gap-4">
      {query.data.page > 1 ? <Link className={clasesEnlaceTexto} href={hrefPagina(query.data.page - 1)}>Anterior</Link> : <span aria-disabled="true">Anterior</span>}
      <span>Página {query.data.page} de {totalPaginas}</span>
      {query.data.page < totalPaginas ? <Link className={clasesEnlaceTexto} href={hrefPagina(query.data.page + 1)}>Siguiente</Link> : <span aria-disabled="true">Siguiente</span>}
    </nav> : null}
  </section>;
}
