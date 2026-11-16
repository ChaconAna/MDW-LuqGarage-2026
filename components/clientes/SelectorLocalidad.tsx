"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";

import { consultarLocalidadesAction } from "@/app/(app)/clientes/nuevo/actions";
import type { PaginaLocalidadesFormulario } from "@/app/(app)/clientes/nuevo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type LocalidadSeleccionada =
  PaginaLocalidadesFormulario["localidades"][number];

type SelectorLocalidadProps = {
  inicial: PaginaLocalidadesFormulario;
  seleccionada?: LocalidadSeleccionada;
  disabled: boolean;
  error?: string;
  onSeleccionar: (localidad: LocalidadSeleccionada | undefined) => void;
};

export default function SelectorLocalidad({
  inicial,
  seleccionada,
  disabled,
  error,
  onSeleccionar,
}: SelectorLocalidadProps) {
  const [datos, setDatos] = useState(inicial);
  const [busqueda, setBusqueda] = useState(inicial.busqueda);
  const [errorCatalogo, setErrorCatalogo] = useState<string>();
  const [pendiente, iniciarTransicion] = useTransition();
  const bloqueo = useRef(false);
  const totalPaginas = Math.max(1, Math.ceil(datos.total / 10));
  const seleccionVisible = datos.localidades.some(
    ({ id }) => id === seleccionada?.id,
  );

  function cargar(pagina: number, termino = datos.busqueda) {
    if (
      bloqueo.current ||
      disabled ||
      pagina < 1 ||
      (pagina > totalPaginas && termino === datos.busqueda)
    ) {
      return;
    }

    bloqueo.current = true;
    setErrorCatalogo(undefined);
    iniciarTransicion(async () => {
      try {
        const resultado = await consultarLocalidadesAction({
          page: pagina,
          limit: 10,
          busqueda: termino,
        });

        if (resultado.ok) {
          setDatos(resultado);
        } else {
          setErrorCatalogo(resultado.error);
        }
      } catch {
        setErrorCatalogo("No pudimos cargar las Localidades. Intentá nuevamente.");
      } finally {
        bloqueo.current = false;
      }
    });
  }

  function buscar() {
    cargar(1, busqueda);
  }

  function buscarConEnter(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== "Enter") return;
    evento.preventDefault();
    buscar();
  }

  return (
    <section
      aria-labelledby="titulo-localidad-cliente"
      aria-busy={pendiente}
      className="min-w-0 space-y-4 rounded-lg border border-current/20 p-4"
    >
      <div>
        <h2 id="titulo-localidad-cliente" className="text-xl font-semibold">
          Localidad (obligatoria)
        </h2>
        <p className="mt-1 text-sm opacity-75">
          La Provincia se obtiene de la Localidad seleccionada.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="buscar-localidad" className="block font-medium">
          Buscar por Localidad o Provincia
        </label>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
          <Input
            id="buscar-localidad"
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            onKeyDown={buscarConEnter}
            disabled={disabled || pendiente}
          />
          <Button
            type="button"
            variant="outline"
            onClick={buscar}
            disabled={disabled || pendiente}
          >
            Buscar
          </Button>
        </div>
      </div>

      {datos.total === 0 ? (
        <p>No hay Localidades que coincidan con la búsqueda.</p>
      ) : (
        <div className="space-y-2">
          <label htmlFor="localidad-cliente" className="block font-medium">
            Opciones de la página
          </label>
          <select
            id="localidad-cliente"
            value={seleccionVisible ? seleccionada?.id : ""}
            onChange={(evento) => {
              const localidad = datos.localidades.find(
                ({ id }) => id === evento.target.value,
              );
              onSeleccionar(localidad);
            }}
            disabled={disabled || pendiente}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "error-localidad-cliente" : undefined}
            className="h-10 w-full min-w-0 rounded-md border border-current/30 bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <option value="">Elegí una Localidad de esta página</option>
            {datos.localidades.map((localidad) => (
              <option key={localidad.id} value={localidad.id}>
                {localidad.nombre} — {localidad.provincia.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {seleccionada ? (
        <p className="rounded-md border border-current/20 p-3 text-sm">
          Localidad seleccionada: {seleccionada.nombre} — Provincia: {" "}
          {seleccionada.provincia.nombre}
        </p>
      ) : (
        <p className="text-sm">Todavía no seleccionaste una Localidad.</p>
      )}

      <nav
        aria-label="Paginación de Localidades"
        className="flex flex-wrap items-center gap-3"
      >
        <Button
          type="button"
          variant="outline"
          disabled={disabled || pendiente || datos.pagina <= 1}
          onClick={() => cargar(datos.pagina - 1)}
        >
          Anterior
        </Button>
        <span className="text-sm">
          Página {datos.pagina} de {totalPaginas}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || pendiente || datos.pagina >= totalPaginas}
          onClick={() => cargar(datos.pagina + 1)}
        >
          Siguiente
        </Button>
      </nav>

      <p role="status" className="text-sm opacity-75">
        {pendiente
          ? "Cargando Localidades…"
          : `${datos.total} Localidades encontradas.`}
      </p>
      {errorCatalogo ? <p role="alert">{errorCatalogo}</p> : null}
      {error ? (
        <p id="error-localidad-cliente" className="text-sm">
          {error}
        </p>
      ) : null}
    </section>
  );
}
