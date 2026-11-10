"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { crearOrdenTrabajoAction, consultarPresupuestosDisponiblesAction, type EstadoCreacionOrdenTrabajo } from "@/app/(app)/ordenes-trabajo/actions";
import { Button } from "@/components/ui/button";

type PresupuestoDisponible = Awaited<ReturnType<typeof consultarPresupuestosDisponiblesAction>> extends infer R
  ? R extends { ok: true; presupuestos: infer P } ? P : never : never;

type Props = {
  siniestroId: string;
  inicial: { presupuestos: PresupuestoDisponible; total: number };
};

export default function FormularioOrdenTrabajo({ siniestroId, inicial }: Props) {
  const [catalogo, setCatalogo] = useState({ ...inicial, pagina: 1 });
  const [seleccionados, setSeleccionados] = useState<PresupuestoDisponible>([]);
  const [errorCatalogo, setErrorCatalogo] = useState<string>();
  const [estado, enviar, pendienteEnvio] = useActionState(crearOrdenTrabajoAction.bind(null, siniestroId), {} as EstadoCreacionOrdenTrabajo);
  const [pendienteCatalogo, cargar] = useTransition();
  const bloqueo = useRef(false);
  const formulario = useRef<HTMLFormElement>(null);
  const [erroresSeleccionVigentes, setErroresSeleccionVigentes] = useState(true);
  const pendiente = pendienteEnvio || pendienteCatalogo;
  const totalPaginas = Math.max(1, Math.ceil(catalogo.total / 10));
  useEffect(() => {
    if (!pendienteEnvio && !pendienteCatalogo) bloqueo.current = false;
    if (estado.errorGeneral) formulario.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();
  }, [pendienteEnvio, pendienteCatalogo, estado]);

  function cambiarPagina(pagina: number) {
    if (bloqueo.current || pagina < 1 || pagina > totalPaginas) return;
    bloqueo.current = true;
    cargar(async () => {
      try {
        const resultado = await consultarPresupuestosDisponiblesAction(siniestroId, pagina);
        if (resultado.ok) { setCatalogo(resultado); setErrorCatalogo(undefined); }
        else setErrorCatalogo(resultado.error);
      } catch { setErrorCatalogo("No pudimos cargar los presupuestos. Intentá nuevamente."); }
      finally { bloqueo.current = false; }
    });
  }

  function quitar(id: string) {
    if (bloqueo.current || pendiente) return;
    setSeleccionados((actuales) => actuales.filter((item) => item.id !== id));
    setErroresSeleccionVigentes(false);
  }

  return <form ref={formulario} noValidate aria-busy={pendiente} className="min-w-0 space-y-6" onSubmit={(event) => {
    event.preventDefault();
    if (bloqueo.current || pendiente || seleccionados.length === 0) return;
    bloqueo.current = true;
    setErroresSeleccionVigentes(true);
    startTransition(() => enviar(seleccionados.map(({ id }) => id)));
  }}>
    {estado.errorGeneral ? <p role="alert" tabIndex={-1}>{estado.errorGeneral}</p> : null}
    {errorCatalogo ? <p role="alert">{errorCatalogo}</p> : null}
    <fieldset disabled={pendiente} className="min-w-0 space-y-4">
      <legend className="text-xl font-semibold">Presupuestos aprobados disponibles</legend>
      <p id="ayuda-presupuestos">Seleccioná uno o varios presupuestos. La selección se conserva al cambiar de página.</p>
      {estado.errorSeleccion && erroresSeleccionVigentes ? <p id="error-presupuestos" role="alert">{estado.errorSeleccion}</p> : null}
      {catalogo.presupuestos.length === 0 ? <p>No hay presupuestos aprobados disponibles para este siniestro.</p> : <ul className="space-y-3">
        {catalogo.presupuestos.map((presupuesto) => <li key={presupuesto.id}>
          <label className="flex min-h-11 items-center gap-3 break-words" htmlFor={`presupuesto-${presupuesto.id}`}>
            <input id={`presupuesto-${presupuesto.id}`} type="checkbox" name="presupuestoIds" value={presupuesto.id}
              aria-describedby={estado.errorSeleccion && erroresSeleccionVigentes ? "ayuda-presupuestos error-presupuestos" : "ayuda-presupuestos"}
              checked={seleccionados.some(({ id }) => id === presupuesto.id)}
              onChange={(event) => {
                if (bloqueo.current || pendiente) return;
                if (event.target.checked) setSeleccionados((actuales) => [...actuales, presupuesto]);
                else quitar(presupuesto.id);
                setErroresSeleccionVigentes(false);
              }} />
            <span className="min-w-0 break-words">Presupuesto {presupuesto.numeroPresupuesto}</span>
          </label>
        </li>)}
      </ul>}
      <nav aria-label="Paginación de presupuestos disponibles" className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={catalogo.pagina <= 1} onClick={() => cambiarPagina(catalogo.pagina - 1)}>Anterior</Button>
        <span>Página {catalogo.pagina} de {totalPaginas}</span>
        <Button type="button" variant="outline" disabled={catalogo.pagina >= totalPaginas} onClick={() => cambiarPagina(catalogo.pagina + 1)}>Siguiente</Button>
      </nav>
      <section aria-labelledby="resumen-seleccion" className="space-y-3">
        <h2 id="resumen-seleccion" className="text-xl font-semibold">Selección ({seleccionados.length})</h2>
        {seleccionados.length === 0 ? <p>Seleccioná al menos un presupuesto para crear la orden.</p> : <ul className="space-y-3">
          {seleccionados.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 break-words">Presupuesto {item.numeroPresupuesto}</span>
            <Button type="button" variant="outline" aria-label={`Quitar de la selección el presupuesto ${item.numeroPresupuesto}`} onClick={() => quitar(item.id)}>Quitar selección</Button>
          </li>)}
        </ul>}
      </section>
      <Button type="submit" disabled={seleccionados.length === 0}>{pendienteEnvio ? "Creando…" : "Crear orden de trabajo"}</Button>
    </fieldset>
    <p role="status" aria-live="polite">{pendienteEnvio ? "Creando orden de trabajo…" : pendienteCatalogo ? "Cargando presupuestos…" : ""}</p>
  </form>;
}
