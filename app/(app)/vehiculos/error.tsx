"use client";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { Button } from "@/components/ui/button";

type VehiculosErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function VehiculosError({ reset }: VehiculosErrorProps) {
  return (
    <main>
      <ContenedorPagina ancho="wide">
        <h1 className="text-2xl font-bold">Vehículos</h1>
        <section aria-labelledby="error-vehiculos-titulo" className="mt-6 rounded-lg border border-current/20 p-6">
          <div role="alert">
            <h2 id="error-vehiculos-titulo" className="text-lg font-semibold">No pudimos cargar los vehículos</h2>
            <p className="mt-2 text-sm opacity-75">Ocurrió un problema inesperado. Intentá nuevamente.</p>
          </div>
          <Button type="button" onClick={reset} className="mt-5">Reintentar</Button>
        </section>
      </ContenedorPagina>
    </main>
  );
}
