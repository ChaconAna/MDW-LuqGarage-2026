"use client";

import Link from "next/link";

import { useNavegacionSelectores } from "@/components/siniestros/NavegacionSelectores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { listarVehiculosActivos } from "@/lib/db/vehiculo";

type VehiculoActivo = Awaited<
  ReturnType<typeof listarVehiculosActivos>
>["vehiculos"][number];

type SelectorVehiculoActivoProps = {
  vehiculos: VehiculoActivo[];
  vehiculoSeleccionado: VehiculoActivo | null;
  errorSeleccion?: string;
  pagina: number;
  totalPaginas: number;
  total: number;
  limite: number;
};

export default function SelectorVehiculoActivo({
  vehiculos,
  vehiculoSeleccionado,
  errorSeleccion,
  pagina,
  totalPaginas,
  total,
  limite,
}: SelectorVehiculoActivoProps) {
  const { pendiente, seleccionar, hrefPagina } = useNavegacionSelectores();

  return (
    <div className="space-y-3" aria-busy={pendiente}>
      <div role="status" className="space-y-1">
        {vehiculoSeleccionado ? (
          <>
            <p className="font-medium">
              Vehículo seleccionado: {vehiculoSeleccionado.patente}
            </p>
            <p>Marca: {vehiculoSeleccionado.modelo.marca.nombre}</p>
            <p>Modelo: {vehiculoSeleccionado.modelo.nombre}</p>
          </>
        ) : (
          <p>No hay un vehículo seleccionado.</p>
        )}
        {pendiente ? <p>Actualizando selección de vehículo…</p> : null}
      </div>

      {vehiculos.length === 0 ? (
        <p>No hay vehículos activos disponibles.</p>
      ) : (
        <fieldset className="space-y-3" aria-describedby={errorSeleccion ? "error-seleccion-vehiculo" : undefined}>
          <legend className="font-medium">Seleccionar vehículo activo</legend>
          <p>
            Mostrando {vehiculos.length} de {total} vehículos activos (hasta {limite}{" "}
            por página).
          </p>
          <ul className="divide-y divide-current/20 rounded-lg border border-current/20">
            {vehiculos.map((vehiculo) => (
              <li key={vehiculo.id}>
                <label
                  htmlFor={`vehiculo-${vehiculo.id}`}
                  className="flex cursor-pointer items-start gap-3 p-4"
                >
                  <Input
                    id={`vehiculo-${vehiculo.id}`}
                    type="radio"
                    name="vehiculoId"
                    value={vehiculo.id}
                    checked={vehiculoSeleccionado?.id === vehiculo.id}
                    onChange={() => seleccionar("vehiculoId", vehiculo.id)}
                    disabled={pendiente}
                    className="mt-1 h-4 w-4 shrink-0 rounded-full p-0 shadow-none"
                  />
                  <span className="min-w-0 space-y-1">
                    <span className="block break-words font-medium">
                      Patente: {vehiculo.patente}
                    </span>
                    <span className="block">Marca: {vehiculo.modelo.marca.nombre}</span>
                    <span className="block">Modelo: {vehiculo.modelo.nombre}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      {errorSeleccion ? <p id="error-seleccion-vehiculo" role="alert">{errorSeleccion}</p> : null}

      <nav
        aria-label="Paginación de vehículos activos"
        className="flex flex-wrap items-center gap-3"
      >
        {pagina > 1 && !pendiente ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={hrefPagina("vehiculosPage", pagina - 1)}
              aria-label={`Ir a la página ${pagina - 1} de vehículos activos`}
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
            aria-label="Página anterior de vehículos activos no disponible"
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
              href={hrefPagina("vehiculosPage", pagina + 1)}
              aria-label={`Ir a la página ${pagina + 1} de vehículos activos`}
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
            aria-label="Página siguiente de vehículos activos no disponible"
          >
            Siguiente
          </Button>
        )}
      </nav>
    </div>
  );
}
