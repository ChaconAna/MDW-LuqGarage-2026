import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { listarVehiculos } from "@/lib/db/vehiculo";
import { clasesEnlaceTexto } from "@/lib/utils";

type TablaVehiculosProps = {
  vehiculos: Awaited<ReturnType<typeof listarVehiculos>>["vehiculos"];
  pagina: number;
  totalPaginas: number;
  total: number;
};

function hrefPaginaVehiculos(pagina: number) {
  return pagina === 1 ? "/vehiculos" : `/vehiculos?page=${pagina}`;
}

export default function TablaVehiculos({
  vehiculos,
  pagina,
  totalPaginas,
  total,
}: TablaVehiculosProps) {
  return (
    <>
      <p className="mt-4 text-sm opacity-75">
        Mostrando {vehiculos.length} de {total} vehículos registrados.
      </p>
      <nav aria-label="Paginación de vehículos" className="mt-5 flex flex-wrap items-center gap-3">
        {pagina > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefPaginaVehiculos(pagina - 1)} aria-label={`Ir a la página ${pagina - 1}`}>
              Anterior
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled aria-label="Página anterior no disponible">
            Anterior
          </Button>
        )}
        <span aria-current="page" className="text-sm">Página {pagina} de {totalPaginas}</span>
        {pagina < totalPaginas ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefPaginaVehiculos(pagina + 1)} aria-label={`Ir a la página ${pagina + 1}`}>
              Siguiente
            </Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled aria-label="Página siguiente no disponible">
            Siguiente
          </Button>
        )}
      </nav>

      <div
        role="region"
        aria-label="Listado de vehículos con desplazamiento horizontal"
        tabIndex={0}
        className="mt-6 overflow-x-auto rounded-lg border border-current/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        <table className="w-full min-w-2xl text-left text-sm">
          <caption className="sr-only">Listado de vehículos</caption>
          <thead className="border-b border-current/20 bg-current/5">
            <tr>
              <th scope="col" className="px-4 py-3">Patente</th>
              <th scope="col" className="px-4 py-3">Marca</th>
              <th scope="col" className="px-4 py-3">Modelo</th>
              <th scope="col" className="px-4 py-3">Tipo de vehículo</th>
              <th scope="col" className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {vehiculos.map((vehiculo) => (
              <tr key={vehiculo.id} className="border-b border-current/10 last:border-b-0">
                <th scope="row" className="px-4 py-3 font-medium">
                  <Link href={`/vehiculos/${vehiculo.id}`} prefetch={false} className={clasesEnlaceTexto}>
                    {vehiculo.patente}
                  </Link>
                </th>
                <td className="px-4 py-3">{vehiculo.modelo.marca.nombre}</td>
                <td className="px-4 py-3">{vehiculo.modelo.nombre}</td>
                <td className="px-4 py-3">{vehiculo.tipoVehiculo.nombre}</td>
                <td className="px-4 py-3">
                  <span className={vehiculo.activo ? "font-medium" : "font-medium opacity-70"}>
                    {vehiculo.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
