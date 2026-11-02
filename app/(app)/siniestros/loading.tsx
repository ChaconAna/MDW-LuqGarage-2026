import ContenedorPagina from "@/components/layout/ContenedorPagina";

export default function LoadingSiniestros() {
  return (
    <main>
      <ContenedorPagina ancho="wide">
        <h1 className="text-2xl font-bold">Siniestros</h1>

        <p role="status" className="mt-3 text-sm opacity-75">
          Cargando siniestros…
        </p>

        <div
          aria-hidden="true"
          className="mt-6 animate-pulse space-y-6 motion-reduce:animate-none"
        >
          <div className="h-10 w-full max-w-sm rounded-md bg-current/10" />

          <div className="overflow-hidden rounded-lg border border-current/20">
            <div className="h-11 border-b border-current/20 bg-current/5" />
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }, (_, indice) => (
                <div
                  key={indice}
                  className="h-5 rounded-sm bg-current/10"
                />
              ))}
            </div>
          </div>
        </div>
      </ContenedorPagina>
    </main>
  );
}
