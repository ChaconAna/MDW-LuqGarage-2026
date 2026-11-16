"use client";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { Button } from "@/components/ui/button";

type ClientesErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ClientesError({ reset }: ClientesErrorProps) {
  return (
    <main>
      <ContenedorPagina ancho="wide">
        <h1 className="text-2xl font-bold">Clientes</h1>

        <section
          aria-labelledby="error-clientes-titulo"
          className="mt-6 rounded-lg border border-current/20 p-6"
        >
          <div role="alert">
            <h2 id="error-clientes-titulo" className="text-lg font-semibold">
              No pudimos cargar los clientes
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
