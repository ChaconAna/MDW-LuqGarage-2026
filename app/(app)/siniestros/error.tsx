"use client";

import ContenedorPagina from "@/components/layout/ContenedorPagina";

type SiniestrosErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SiniestrosError({ reset }: SiniestrosErrorProps) {
  return (
    <main>
      <ContenedorPagina ancho="wide">
        <h1 className="text-2xl font-bold">Siniestros</h1>

        <section
          aria-labelledby="error-siniestros-titulo"
          className="mt-6 rounded-lg border border-current/20 p-6"
        >
          <div role="alert">
            <h2 id="error-siniestros-titulo" className="text-lg font-semibold">
              No pudimos cargar los siniestros
            </h2>
            <p className="mt-2 text-sm opacity-75">
              Ocurrió un problema inesperado. Intentá nuevamente.
            </p>
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Reintentar
          </button>
        </section>
      </ContenedorPagina>
    </main>
  );
}
