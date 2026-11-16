import ContenedorPagina from "@/components/layout/ContenedorPagina";

export default function LoadingClienteDetalle() {
  return (
    <main>
      <ContenedorPagina ancho="narrow">
        <p role="status" className="text-sm opacity-75">
          Cargando detalle del cliente…
        </p>

        <div
          aria-hidden="true"
          className="mt-6 animate-pulse space-y-6 motion-reduce:animate-none"
        >
          <div className="h-7 w-64 max-w-full rounded-sm bg-current/10" />
          <div className="space-y-4 rounded-lg border border-current/20 p-5">
            {Array.from({ length: 5 }, (_, indice) => (
              <div key={indice} className="h-5 rounded-sm bg-current/10" />
            ))}
          </div>
        </div>
      </ContenedorPagina>
    </main>
  );
}
