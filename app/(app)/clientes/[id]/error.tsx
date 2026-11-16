"use client";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { Button } from "@/components/ui/button";

type ClienteDetalleErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ClienteDetalleError({
  reset,
}: ClienteDetalleErrorProps) {
  return (
    <main>
      <ContenedorPagina ancho="narrow">
        <h1 className="text-2xl font-bold">Detalle del cliente</h1>

        <section
          aria-labelledby="error-cliente-detalle-titulo"
          className="mt-6 rounded-lg border border-current/20 p-6"
        >
          <div role="alert">
            <h2
              id="error-cliente-detalle-titulo"
              className="text-lg font-semibold"
            >
              No pudimos cargar el cliente
            </h2>
            <p className="mt-2 text-sm opacity-75">
              Ocurrió un problema inesperado. Intentá nuevamente.
            </p>
          </div>

          <Button type="button" onClick={reset} className="mt-5">
            Reintentar
          </Button>
        </section>
      </ContenedorPagina>
    </main>
  );
}
