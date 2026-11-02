"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { listarClientesActivos } from "@/lib/db/cliente";

type ClienteActivo = Awaited<
  ReturnType<typeof listarClientesActivos>
>["clientes"][number];

type SelectorClienteActivoProps = {
  clientes: ClienteActivo[];
  clienteSeleccionado: ClienteActivo | null;
  errorSeleccion?: string;
  pagina: number;
  totalPaginas: number;
  total: number;
  limite: number;
};

export default function SelectorClienteActivo({
  clientes,
  clienteSeleccionado,
  errorSeleccion,
  pagina,
  totalPaginas,
  total,
  limite,
}: SelectorClienteActivoProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendiente, iniciarTransicion] = useTransition();

  function seleccionarCliente(clienteId: string) {
    if (pendiente) return;

    const parametros = new URLSearchParams(searchParams.toString());
    parametros.set("clienteId", clienteId);

    iniciarTransicion(() => {
      router.replace(`${pathname}?${parametros.toString()}`, { scroll: false });
    });
  }

  function hrefPaginaClientes(numero: number) {
    const parametros = new URLSearchParams(searchParams.toString());

    if (numero === 1) {
      parametros.delete("clientesPage");
    } else {
      parametros.set("clientesPage", String(numero));
    }

    if (clienteSeleccionado) {
      parametros.set("clienteId", clienteSeleccionado.id);
    } else {
      parametros.delete("clienteId");
    }

    const query = parametros.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div className="space-y-3" aria-busy={pendiente}>
      {errorSeleccion ? <p role="alert">{errorSeleccion}</p> : null}

      <div role="status" className="space-y-1">
        {clienteSeleccionado ? (
          <>
            <p className="font-medium">
              Cliente seleccionado: {clienteSeleccionado.nombre}{" "}
              {clienteSeleccionado.apellido}
            </p>
            <p>DNI: {clienteSeleccionado.dni}</p>
          </>
        ) : (
          <p>No hay un cliente seleccionado.</p>
        )}
        {pendiente ? <p>Actualizando selección de cliente…</p> : null}
      </div>

      {clientes.length === 0 ? (
        <p>No hay clientes activos disponibles.</p>
      ) : (
        <fieldset className="space-y-3">
          <legend className="font-medium">Seleccionar cliente activo</legend>
          <p>
            Mostrando {clientes.length} de {total} clientes activos (hasta {limite}{" "}
            por página).
          </p>
          <ul className="divide-y divide-current/20 rounded-lg border border-current/20">
            {clientes.map((cliente) => (
              <li key={cliente.id}>
                <label
                  htmlFor={`cliente-${cliente.id}`}
                  className="flex cursor-pointer items-start gap-3 p-4"
                >
                  <Input
                    id={`cliente-${cliente.id}`}
                    type="radio"
                    name="clienteId"
                    value={cliente.id}
                    checked={clienteSeleccionado?.id === cliente.id}
                    onChange={() => seleccionarCliente(cliente.id)}
                    disabled={pendiente}
                    className="mt-1 h-4 w-4 shrink-0 rounded-full p-0 shadow-none"
                  />
                  <span className="min-w-0 space-y-1">
                    <span className="block break-words font-medium">
                      {cliente.nombre} {cliente.apellido}
                    </span>
                    <span className="block">DNI: {cliente.dni}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <nav
        aria-label="Paginación de clientes activos"
        className="flex flex-wrap items-center gap-3"
      >
        {pagina > 1 && !pendiente ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={hrefPaginaClientes(pagina - 1)}
              aria-label={`Ir a la página ${pagina - 1} de clientes activos`}
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
            aria-label="Página anterior de clientes activos no disponible"
          >
            Anterior
          </Button>
        )}

        <span aria-current="page" className="text-sm">
          Página {pagina} de {totalPaginas}
        </span>

        {pagina < totalPaginas && !pendiente ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={hrefPaginaClientes(pagina + 1)}
              aria-label={`Ir a la página ${pagina + 1} de clientes activos`}
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
            aria-label="Página siguiente de clientes activos no disponible"
          >
            Siguiente
          </Button>
        )}
      </nav>
    </div>
  );
}
