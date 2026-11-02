import Link from "next/link";

import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { clasesEnlaceTexto } from "@/lib/utils";

export default function NotFound() {
  return (
    <main>
      <ContenedorPagina ancho="narrow">
        <h1 className="text-2xl font-bold">Página no encontrada</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          La página solicitada no está disponible.
        </p>
        <Link
          href="/"
          className={`${clasesEnlaceTexto} mt-6 inline-block`}
        >
          Volver al inicio
        </Link>
      </ContenedorPagina>
    </main>
  );
}
