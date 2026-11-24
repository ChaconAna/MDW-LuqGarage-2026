import Link from "next/link";
import type { EstadoPresupuesto } from "@prisma/client";

import { Button } from "@/components/ui/button";
import type { listarPresupuestos } from "@/lib/db/presupuesto";
import { clasesEnlaceTexto } from "@/lib/utils";

type TablaPresupuestosProps = {
  presupuestos: Awaited<ReturnType<typeof listarPresupuestos>>["presupuestos"];
  pagina: number;
  totalPaginas: number;
  total: number;
};

const etiquetasEstado = {
  BORRADOR: "Borrador",
  ENVIADO: "Enviado",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
} satisfies Record<EstadoPresupuesto, string>;

function hrefPaginaPresupuestos(pagina: number) {
  return pagina === 1 ? "/presupuestos" : `/presupuestos?page=${pagina}`;
}

export default function TablaPresupuestos({
  presupuestos,
  pagina,
  totalPaginas,
  total,
}: TablaPresupuestosProps) {
  return (
    <>
      <p className="mt-4 text-sm opacity-75">
        Mostrando {presupuestos.length} de {total} presupuestos registrados.
      </p>
      <nav aria-label="Paginación de presupuestos" className="mt-5 flex flex-wrap items-center gap-3">
        {pagina > 1 ? (
          <Button asChild variant="outline" size="sm" className="min-h-11">
            <Link href={hrefPaginaPresupuestos(pagina - 1)} aria-label={`Ir a la página ${pagina - 1}`}>
              Anterior
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" className="min-h-11" disabled aria-label="Página anterior no disponible">
            Anterior
          </Button>
        )}
        <span className="text-sm">Página {pagina} de {totalPaginas}</span>
        {pagina < totalPaginas ? (
          <Button asChild variant="outline" size="sm" className="min-h-11">
            <Link href={hrefPaginaPresupuestos(pagina + 1)} aria-label={`Ir a la página ${pagina + 1}`}>
              Siguiente
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" className="min-h-11" disabled aria-label="Página siguiente no disponible">
            Siguiente
          </Button>
        )}
      </nav>

      <div className="mt-6 rounded-lg border border-current/20">
        <table className="w-full table-fixed text-left text-sm [overflow-wrap:anywhere]">
          <caption className="sr-only">Listado de presupuestos</caption>
          <thead className="border-b border-current/20 bg-current/5 text-xs sm:text-sm">
            <tr>
              <th scope="col" className="px-2 py-3 sm:px-4">Presupuesto</th>
              <th scope="col" className="px-2 py-3 sm:px-4">Estado</th>
              <th scope="col" className="px-2 py-3 sm:px-4">Siniestro</th>
            </tr>
          </thead>
          <tbody>
            {presupuestos.map((presupuesto) => (
              <tr key={presupuesto.id} className="border-b border-current/10 last:border-b-0">
                <th scope="row" className="px-2 py-3 font-medium sm:px-4">
                  <Link href={`/presupuestos/${presupuesto.id}`} prefetch={false} className={clasesEnlaceTexto}>
                    {presupuesto.numeroPresupuesto}
                  </Link>
                </th>
                <td className="px-2 py-3 sm:px-4">{etiquetasEstado[presupuesto.estado]}</td>
                <td className="px-2 py-3 sm:px-4">
                  <Link href={`/siniestros/${presupuesto.siniestro.id}`} prefetch={false} className={clasesEnlaceTexto}>
                    {presupuesto.siniestro.numeroSiniestro}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
