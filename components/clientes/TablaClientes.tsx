import Link from "next/link";

import { Button } from "@/components/ui/button";
import { clasesEnlaceTexto } from "@/lib/utils";

type ClienteFila = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  activo: boolean;
  localidad: {
    nombre: string;
    provincia: {
      nombre: string;
    };
  };
};

type TablaClientesProps = {
  clientes: ClienteFila[];
  pagina: number;
  totalPaginas: number;
  total: number;
};

function hrefPaginaClientes(pagina: number) {
  return pagina === 1 ? "/clientes" : `/clientes?page=${pagina}`;
}

export default function TablaClientes({
  clientes,
  pagina,
  totalPaginas,
  total,
}: TablaClientesProps) {
  return (
    <>
      <p className="mt-4 text-sm opacity-75">
        Mostrando {clientes.length} de {total} clientes registrados.
      </p>

      <nav
        aria-label="Paginación de clientes"
        className="mt-5 flex flex-wrap items-center gap-3"
      >
        {pagina > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={hrefPaginaClientes(pagina - 1)}
              aria-label={`Ir a la página ${pagina - 1}`}
            >
              Anterior
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            aria-label="Página anterior no disponible"
          >
            Anterior
          </Button>
        )}

        <span aria-current="page" className="text-sm">
          Página {pagina} de {totalPaginas}
        </span>

        {pagina < totalPaginas ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={hrefPaginaClientes(pagina + 1)}
              aria-label={`Ir a la página ${pagina + 1}`}
            >
              Siguiente
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            aria-label="Página siguiente no disponible"
          >
            Siguiente
          </Button>
        )}
      </nav>

      <div
        role="region"
        aria-label="Listado de clientes con desplazamiento horizontal"
        tabIndex={0}
        className="mt-6 overflow-x-auto rounded-lg border border-current/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        <table className="w-full min-w-5xl text-left text-sm">
          <caption className="sr-only">Listado de clientes</caption>
          <thead className="border-b border-current/20 bg-current/5">
            <tr>
              <th scope="col" className="px-4 py-3">Nombre</th>
              <th scope="col" className="px-4 py-3">Apellido</th>
              <th scope="col" className="px-4 py-3">DNI</th>
              <th scope="col" className="px-4 py-3">Teléfono</th>
              <th scope="col" className="px-4 py-3">Email</th>
              <th scope="col" className="px-4 py-3">Localidad</th>
              <th scope="col" className="px-4 py-3">Provincia</th>
              <th scope="col" className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr
                key={cliente.id}
                className="border-b border-current/10 last:border-b-0"
              >
                <th scope="row" className="px-4 py-3 font-medium">
                  <Link
                    href={`/clientes/${cliente.id}`}
                    prefetch={false}
                    className={clasesEnlaceTexto}
                  >
                    {cliente.nombre}
                  </Link>
                </th>
                <td className="px-4 py-3">{cliente.apellido}</td>
                <td className="whitespace-nowrap px-4 py-3">{cliente.dni}</td>
                <td className="whitespace-nowrap px-4 py-3">{cliente.telefono}</td>
                <td className="px-4 py-3">{cliente.email}</td>
                <td className="px-4 py-3">{cliente.localidad.nombre}</td>
                <td className="px-4 py-3">
                  {cliente.localidad.provincia.nombre}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      cliente.activo
                        ? "font-medium"
                        : "font-medium opacity-70"
                    }
                  >
                    {cliente.activo ? "Activo" : "Inactivo"}
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
