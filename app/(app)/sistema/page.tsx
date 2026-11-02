import ContenedorPagina from "@/components/layout/ContenedorPagina";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { autorizarPagina } from "@/lib/authPagina";
import { clasesEnlaceTexto } from "@/lib/utils";

const rolesConAcceso = [
  "RECEPCIONISTA",
  "ENCARGADO_DEL_TALLER",
  "MECANICO",
  "ADMINISTRADOR",
] as const;

export default async function SistemaPage() {
  const autorizacion = await autorizarPagina(rolesConAcceso);

  if (!autorizacion.autorizado) {
    return (
      <main>
        <ContenedorPagina ancho="wide">
          <h1 className="text-2xl font-bold">Acceso denegado</h1>
          <p className="mt-3">
            No tenés permisos para consultar el sistema de diseño.
          </p>
        </ContenedorPagina>
      </main>
    );
  }

  return (
    <main>
      <ContenedorPagina ancho="wide">
        <header>
          <h1 className="text-2xl font-bold">Sistema de diseño</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Referencia visual de los estilos y componentes reutilizables de
            LuqGarage.
          </p>
        </header>

        <div className="mt-8 space-y-10">
          <section aria-labelledby="sistema-colores">
            <h2 id="sistema-colores" className="text-lg font-semibold">
              Colores y tokens
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              LuqGarage utiliza un tema oscuro permanente en toda la
              aplicación.
            </p>

            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <li className="rounded-lg border border-border p-3">
                <div
                  aria-hidden="true"
                  className="h-12 rounded-md border border-border bg-background"
                />
                <code className="mt-2 block text-sm">background</code>
              </li>
              <li className="rounded-lg border border-border p-3">
                <div
                  aria-hidden="true"
                  className="h-12 rounded-md bg-foreground"
                />
                <code className="mt-2 block text-sm">foreground</code>
              </li>
              <li className="rounded-lg border border-border p-3">
                <div aria-hidden="true" className="h-12 rounded-md bg-link" />
                <code className="mt-2 block text-sm">link</code>
              </li>
              <li className="rounded-lg border border-border p-3">
                <div
                  aria-hidden="true"
                  className="h-12 rounded-md bg-focus-ring"
                />
                <code className="mt-2 block text-sm">focus-ring</code>
              </li>
              <li className="rounded-lg border border-border p-3">
                <div
                  aria-hidden="true"
                  className="h-12 rounded-md bg-primary"
                />
                <code className="mt-2 block text-sm">primary</code>
              </li>
              <li className="rounded-lg border border-border p-3">
                <div
                  aria-hidden="true"
                  className="h-12 rounded-md bg-secondary"
                />
                <code className="mt-2 block text-sm">secondary</code>
              </li>
              <li className="rounded-lg border border-border p-3">
                <div aria-hidden="true" className="h-12 rounded-md bg-muted" />
                <code className="mt-2 block text-sm">muted</code>
              </li>
              <li className="rounded-lg border border-border p-3">
                <div
                  aria-hidden="true"
                  className="h-12 rounded-md bg-destructive"
                />
                <code className="mt-2 block text-sm">destructive</code>
              </li>
              <li className="rounded-lg border border-border p-3">
                <div
                  aria-hidden="true"
                  className="h-12 rounded-md border-4 border-border bg-background"
                />
                <code className="mt-2 block text-sm">border</code>
              </li>
              <li className="rounded-lg border border-border p-3">
                <div aria-hidden="true" className="h-12 rounded-md bg-input" />
                <code className="mt-2 block text-sm">input</code>
              </li>
            </ul>
          </section>

          <section aria-labelledby="sistema-tipografia">
            <h2 id="sistema-tipografia" className="text-lg font-semibold">
              Tipografía
            </h2>
            <div className="mt-4 space-y-4 rounded-lg border border-border p-5">
              <p className="text-2xl font-bold">Título principal</p>
              <p className="text-lg font-semibold">Título de sección</p>
              <p>Texto de lectura general para contenidos de la aplicación.</p>
              <p className="text-sm text-muted-foreground">
                Texto auxiliar para información secundaria.
              </p>
              <a
                href="#sistema-botones"
                className={`${clasesEnlaceTexto} inline-block`}
              >
                Enlace de ejemplo
              </a>
            </div>
          </section>

          <section aria-labelledby="sistema-botones">
            <h2 id="sistema-botones" className="text-lg font-semibold">
              Botones
            </h2>
            <div className="mt-4 space-y-5 rounded-lg border border-border p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button">Principal</Button>
                <Button type="button" variant="outline">
                  Contorno
                </Button>
                <Button type="button" variant="secondary">
                  Secundario
                </Button>
                <Button type="button" variant="ghost">
                  Sutil
                </Button>
                <Button type="button" variant="destructive">
                  Destructivo
                </Button>
                <Button type="button" variant="link">
                  Enlace
                </Button>
                <Button type="button" disabled>
                  Deshabilitado
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" size="sm">
                  Pequeño
                </Button>
                <Button type="button">Predeterminado</Button>
                <Button type="button" size="lg">
                  Grande
                </Button>
              </div>
            </div>
          </section>

          <section aria-labelledby="sistema-campos">
            <h2 id="sistema-campos" className="text-lg font-semibold">
              Campos
            </h2>
            <div className="mt-4 grid gap-5 rounded-lg border border-border p-5 sm:grid-cols-2">
              <div>
                <label htmlFor="campo-normal" className="text-sm font-medium">
                  Campo normal
                </label>
                <Input
                  id="campo-normal"
                  className="mt-2"
                  placeholder="Ingresá un valor"
                />
              </div>

              <div>
                <label htmlFor="campo-con-valor" className="text-sm font-medium">
                  Campo con valor
                </label>
                <Input
                  id="campo-con-valor"
                  className="mt-2"
                  defaultValue="Contenido de ejemplo"
                />
              </div>

              <div>
                <label
                  htmlFor="campo-deshabilitado"
                  className="text-sm font-medium"
                >
                  Campo deshabilitado
                </label>
                <Input
                  id="campo-deshabilitado"
                  className="mt-2"
                  defaultValue="No editable"
                  disabled
                />
              </div>

              <div>
                <label htmlFor="campo-invalido" className="text-sm font-medium">
                  Campo inválido
                </label>
                <Input
                  id="campo-invalido"
                  className="mt-2"
                  aria-invalid="true"
                  aria-describedby="campo-invalido-mensaje"
                  defaultValue="Valor inválido"
                />
                <p
                  id="campo-invalido-mensaje"
                  className="mt-2 text-sm text-destructive"
                >
                  Revisá el valor ingresado.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="sistema-estados">
            <h2 id="sistema-estados" className="text-lg font-semibold">
              Estados visuales
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Son vistas estáticas de referencia y no anuncian eventos reales.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <article
                aria-labelledby="estado-carga"
                className="rounded-lg border border-border p-5"
              >
                <h3 id="estado-carga" className="font-semibold">
                  Carga
                </h3>
                <div
                  aria-hidden="true"
                  className="mt-4 animate-pulse space-y-3 motion-reduce:animate-none"
                >
                  <div className="h-4 w-3/4 rounded-sm bg-current/10" />
                  <div className="h-4 rounded-sm bg-current/10" />
                  <div className="h-4 w-5/6 rounded-sm bg-current/10" />
                </div>
              </article>

              <article
                aria-labelledby="estado-vacio"
                className="rounded-lg border border-border p-5"
              >
                <h3 id="estado-vacio" className="font-semibold">
                  Vacío
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  No hay elementos registrados todavía.
                </p>
              </article>

              <article
                aria-labelledby="estado-sin-resultados"
                className="rounded-lg border border-border p-5"
              >
                <h3 id="estado-sin-resultados" className="font-semibold">
                  Sin resultados
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  No hay elementos que coincidan con la búsqueda.
                </p>
              </article>

              <article
                aria-labelledby="estado-error"
                className="rounded-lg border border-destructive/40 p-5"
              >
                <h3 id="estado-error" className="font-semibold text-destructive">
                  Error
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  No pudimos cargar la información. Intentá nuevamente.
                </p>
              </article>
            </div>
          </section>
        </div>
      </ContenedorPagina>
    </main>
  );
}
