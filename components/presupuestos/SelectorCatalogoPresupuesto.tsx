"use client";

import { useRef, useState, useTransition } from "react";
import { consultarCatalogoPresupuestoAction } from "@/app/(app)/presupuestos/actions";
import { Button } from "@/components/ui/button";
import type { TipoCatalogoPresupuesto } from "@/lib/schemas/catalogoPresupuesto";
import type { OpcionCatalogoPresupuesto, PaginaCatalogoPresupuesto } from "@/lib/services/presupuestoFormulario";

type SelectorCatalogoPresupuestoProps = {
  tipo: TipoCatalogoPresupuesto;
  inicial: PaginaCatalogoPresupuesto;
  seleccionados: string[];
  disabled: boolean;
  onAgregar: (opcion: OpcionCatalogoPresupuesto) => void;
};

export default function SelectorCatalogoPresupuesto({ tipo, inicial, seleccionados, disabled, onAgregar }: SelectorCatalogoPresupuestoProps) {
  const [datos, setDatos] = useState({ ...inicial, pagina: 1 });
  const [elegido, setElegido] = useState("");
  const [error, setError] = useState<string>();
  const [pendiente, iniciarTransicion] = useTransition();
  const bloqueo = useRef(false);
  const totalPaginas = Math.max(1, Math.ceil(datos.total / 10));

  function cargar(pagina: number) {
    if (bloqueo.current || disabled || pagina < 1 || pagina > totalPaginas) return;
    bloqueo.current = true;
    setError(undefined);
    iniciarTransicion(async () => {
      try {
        const resultado = await consultarCatalogoPresupuestoAction({ tipo, page: pagina, limit: 10 });
        if (resultado.ok) {
          setDatos(resultado);
          setElegido("");
        } else setError(resultado.error);
      } catch {
        setError("No pudimos cargar el catálogo. Intentá nuevamente.");
      } finally {
        bloqueo.current = false;
      }
    });
  }

  return (
    <div className="min-w-0 space-y-3" aria-busy={pendiente}>
      <label htmlFor={`catalogo-${tipo}`} className="block font-medium">Catálogo de {tipo}</label>
      {datos.total === 0 ? <p>No hay {tipo} disponibles en el catálogo.</p> : (
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
          <select
            id={`catalogo-${tipo}`}
            value={elegido}
            onChange={(evento) => setElegido(evento.target.value)}
            disabled={disabled || pendiente}
            className="h-10 w-full min-w-0 rounded-md border border-current/30 bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <option value="">Elegí una opción de esta página</option>
            {datos.opciones.map((opcion) => (
              <option key={opcion.id} value={opcion.id} disabled={seleccionados.includes(opcion.id)}>
                {opcion.nombre}{seleccionados.includes(opcion.id) ? " (incorporado)" : ""}
              </option>
            ))}
          </select>
          <Button type="button" disabled={disabled || pendiente || !elegido || seleccionados.includes(elegido)} onClick={() => {
            const opcion = datos.opciones.find(({ id }) => id === elegido);
            if (opcion && !seleccionados.includes(opcion.id)) {
              onAgregar(opcion);
              setElegido("");
            }
          }}>Agregar {tipo === "reparaciones" ? "reparación" : "repuesto"}</Button>
        </div>
      )}
      <nav aria-label={`Paginación del catálogo de ${tipo}`} className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={disabled || pendiente || datos.pagina <= 1} onClick={() => cargar(datos.pagina - 1)}>Anterior</Button>
        <span className="text-sm">Página {datos.pagina} de {totalPaginas}</span>
        <Button type="button" variant="outline" disabled={disabled || pendiente || datos.pagina >= totalPaginas} onClick={() => cargar(datos.pagina + 1)}>Siguiente</Button>
      </nav>
      <p role="status" className="text-sm">{pendiente ? "Cargando opciones…" : `${datos.total} opciones en total. Las filas incorporadas se conservan al cambiar de página.`}</p>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
