import Link from "next/link";
import { redirect } from "next/navigation";
import type { RolUsuario } from "@prisma/client";
import { listarPresupuestosPorSiniestro } from "@/lib/db/presupuesto";
import { listadoPresupuestosQuerySchema } from "@/lib/schemas/presupuesto";
import { clasesEnlaceTexto } from "@/lib/utils";

type PresupuestosSiniestroProps = {
  siniestroId: string;
  rol: RolUsuario;
  paginaParametro: string | string[] | undefined;
};

export default async function PresupuestosSiniestro({ siniestroId, rol, paginaParametro }: PresupuestosSiniestroProps) {
  const base = `/siniestros/${siniestroId}`;
  const hrefPagina = (pagina: number) => pagina === 1 ? base : `${base}?presupuestosPage=${pagina}`;
  const query = listadoPresupuestosQuerySchema.safeParse({ page: paginaParametro, limit: 10 });
  if ((paginaParametro !== undefined && typeof paginaParametro !== "string") || !query.success) redirect(base);
  const { presupuestos, total } = await listarPresupuestosPorSiniestro(siniestroId, query.data.page, 10);
  const totalPaginas = Math.max(1, Math.ceil(total / 10));
  if (query.data.page > totalPaginas) redirect(hrefPagina(totalPaginas));

  return (
    <section aria-labelledby="presupuestos-siniestro" className="min-w-0 space-y-4 rounded-lg border border-current/20 p-4">
      <h2 id="presupuestos-siniestro" className="text-xl font-semibold">Presupuestos asociados</h2>
      {rol === "ENCARGADO_DEL_TALLER" ? <Link href={`${base}/presupuestos/nuevo`} className={`${clasesEnlaceTexto} inline-block`}>Crear presupuesto</Link> : null}
      {total === 0 ? <p>No hay presupuestos asociados a este siniestro.</p> : (
        <ul className="space-y-3">
          {presupuestos.map((presupuesto) => <li key={presupuesto.id} className="break-words">
            <Link href={`/presupuestos/${presupuesto.id}`} className={clasesEnlaceTexto}>Presupuesto {presupuesto.numeroPresupuesto}</Link>
            <span className="block text-sm">Estado: {presupuesto.estado}</span>
          </li>)}
        </ul>
      )}
      {total > 0 ? <nav aria-label="Paginación de presupuestos del siniestro" className="flex flex-wrap items-center gap-4">
        {query.data.page > 1 ? <Link href={hrefPagina(query.data.page - 1)} className={clasesEnlaceTexto}>Anterior</Link> : <span aria-disabled="true">Anterior</span>}
        <span>Página {query.data.page} de {totalPaginas}</span>
        {query.data.page < totalPaginas ? <Link href={hrefPagina(query.data.page + 1)} className={clasesEnlaceTexto}>Siguiente</Link> : <span aria-disabled="true">Siguiente</span>}
      </nav> : null}
    </section>
  );
}
