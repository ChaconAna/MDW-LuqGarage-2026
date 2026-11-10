"use client";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { Button } from "@/components/ui/button";

export default function OrdenesTrabajoError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main><ContenedorPagina ancho="narrow"><div className="space-y-4">
    <h1 className="text-2xl font-bold">Órdenes de trabajo</h1>
    <p role="alert">No pudimos cargar las órdenes de trabajo. Intentá nuevamente.</p>
    <Button type="button" onClick={reset}>Reintentar</Button>
  </div></ContenedorPagina></main>;
}
