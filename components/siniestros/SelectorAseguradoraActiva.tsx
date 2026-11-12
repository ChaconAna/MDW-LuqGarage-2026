"use client";

import Link from "next/link";

import { useNavegacionSelectores } from "@/components/siniestros/NavegacionSelectores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { listarAseguradorasActivas } from "@/lib/db/aseguradora";

type AseguradoraActiva = Awaited<
  ReturnType<typeof listarAseguradorasActivas>
>["aseguradoras"][number];

type SelectorAseguradoraActivaProps = {
  aseguradoras: AseguradoraActiva[];
  aseguradoraSeleccionada: AseguradoraActiva | null;
  errorSeleccion?: string;
  pagina: number;
  totalPaginas: number;
  total: number;
  limite: number;
};

export default function SelectorAseguradoraActiva({
  aseguradoras,
  aseguradoraSeleccionada,
  errorSeleccion,
  pagina,
  totalPaginas,
  total,
  limite,
}: SelectorAseguradoraActivaProps) {
  const { pendiente, seleccionar, hrefPagina } = useNavegacionSelectores();

  return (
    <div className="space-y-3" aria-busy={pendiente}>
      <div role="status" className="space-y-1">
        {aseguradoraSeleccionada ? (
          <>
            <p className="font-medium">
              Aseguradora seleccionada: {aseguradoraSeleccionada.nombre}
            </p>
            <p>CUIT: {aseguradoraSeleccionada.cuit}</p>
          </>
        ) : (
          <p>No hay una aseguradora seleccionada.</p>
        )}
        {pendiente ? <p>Actualizando selección de aseguradora…</p> : null}
      </div>

      {aseguradoras.length === 0 ? (
        <p>No hay aseguradoras activas disponibles.</p>
      ) : (
        <fieldset className="space-y-3" aria-describedby={errorSeleccion ? "error-seleccion-aseguradora" : undefined}>
          <legend className="font-medium">Seleccionar aseguradora activa</legend>
          <p>
            Mostrando {aseguradoras.length} de {total} aseguradoras activas (hasta {limite}{" "}
            por página).
          </p>
          <ul className="divide-y divide-current/20 rounded-lg border border-current/20">
            {aseguradoras.map((aseguradora) => (
              <li key={aseguradora.id}>
                <label
                  htmlFor={`aseguradora-${aseguradora.id}`}
                  className="flex cursor-pointer items-start gap-3 p-4"
                >
                  <Input
                    id={`aseguradora-${aseguradora.id}`}
                    type="radio"
                    name="aseguradoraId"
                    value={aseguradora.id}
                    checked={aseguradoraSeleccionada?.id === aseguradora.id}
                    onChange={() => seleccionar("aseguradoraId", aseguradora.id)}
                    disabled={pendiente}
                    className="mt-1 h-4 w-4 shrink-0 rounded-full p-0 shadow-none"
                  />
                  <span className="min-w-0 space-y-1">
                    <span className="block break-words font-medium">
                      {aseguradora.nombre}
                    </span>
                    <span className="block">CUIT: {aseguradora.cuit}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      {errorSeleccion ? <p id="error-seleccion-aseguradora" role="alert">{errorSeleccion}</p> : null}

      <nav
        aria-label="Paginación de aseguradoras activas"
        className="flex flex-wrap items-center gap-3"
      >
        {pagina > 1 && !pendiente ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={hrefPagina("aseguradorasPage", pagina - 1)}
              aria-label={`Ir a la página ${pagina - 1} de aseguradoras activas`}
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
            aria-label="Página anterior de aseguradoras activas no disponible"
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
              href={hrefPagina("aseguradorasPage", pagina + 1)}
              aria-label={`Ir a la página ${pagina + 1} de aseguradoras activas`}
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
            aria-label="Página siguiente de aseguradoras activas no disponible"
          >
            Siguiente
          </Button>
        )}
      </nav>
    </div>
  );
}
