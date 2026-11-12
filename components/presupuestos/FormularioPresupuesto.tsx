"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { actualizarPresupuestoAction } from "@/app/(app)/presupuestos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { costoReparacionSchema, type DatosCreacionPresupuesto } from "@/lib/schemas/presupuesto";
import { calcularTotalPresupuesto, type serializarDetallePresupuesto } from "@/lib/services/presupuesto";
import type { EstadoFormularioPresupuesto, PaginaCatalogoPresupuesto } from "@/lib/services/presupuestoFormulario";
import SelectorCatalogoPresupuesto from "./SelectorCatalogoPresupuesto";

type ReparacionFormulario = DatosCreacionPresupuesto["reparaciones"][number] & { nombre: string };
type RepuestoFormulario = Omit<DatosCreacionPresupuesto["repuestos"][number], "cantidad"> & { nombre: string; cantidad: string };
type FormularioPresupuestoProps = {
  catalogoReparaciones: PaginaCatalogoPresupuesto;
  catalogoRepuestos: PaginaCatalogoPresupuesto;
} & (
  | { inicial?: undefined; accionCrear: (anterior: EstadoFormularioPresupuesto, entrada: unknown) => Promise<EstadoFormularioPresupuesto> }
  | { inicial: ReturnType<typeof serializarDetallePresupuesto>; accionCrear?: never }
);

const estadoInicial: EstadoFormularioPresupuesto = { errores: {} };

export default function FormularioPresupuesto(props: FormularioPresupuestoProps) {
  const { inicial, catalogoReparaciones, catalogoRepuestos } = props;
  const [numero, setNumero] = useState(inicial?.numeroPresupuesto ?? "");
  const [reparaciones, setReparaciones] = useState<ReparacionFormulario[]>(() => inicial?.reparaciones.map((detalle) => ({ reparacionId: detalle.reparacion.id, nombre: detalle.reparacion.nombre, costo: detalle.costo })) ?? []);
  const [repuestos, setRepuestos] = useState<RepuestoFormulario[]>(() => inicial?.repuestos.map((detalle) => ({ repuestoId: detalle.repuesto.id, nombre: detalle.repuesto.nombre, cantidad: String(detalle.cantidad) })) ?? []);
  const accion = inicial ? actualizarPresupuestoAction.bind(null, inicial.id) : props.accionCrear;
  const [estado, enviar, pendiente] = useActionState(accion, estadoInicial);
  const [respuestaSinErroresReparaciones, setRespuestaSinErroresReparaciones] = useState<EstadoFormularioPresupuesto | null>(null);
  const [respuestaSinErroresRepuestos, setRespuestaSinErroresRepuestos] = useState<EstadoFormularioPresupuesto | null>(null);
  // El descarte sólo afecta a esta respuesta; un nuevo resultado vuelve a mostrar sus errores.
  const erroresReparaciones: EstadoFormularioPresupuesto["errores"] = respuestaSinErroresReparaciones === estado ? {} : estado.errores;
  const erroresRepuestos: EstadoFormularioPresupuesto["errores"] = respuestaSinErroresRepuestos === estado ? {} : estado.errores;
  const bloqueo = useRef(false);
  const formulario = useRef<HTMLFormElement>(null);
  const costosValidos = reparaciones.every(({ costo }) => costoReparacionSchema.safeParse(costo).success);
  const total = costosValidos ? calcularTotalPresupuesto(reparaciones.map(({ costo }) => costo)) : null;

  useEffect(() => {
    if (!pendiente) {
      bloqueo.current = false;
      if (estado.errorGeneral) formulario.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();
    }
  }, [pendiente, estado]);

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (bloqueo.current || pendiente) return;
    bloqueo.current = true;
    const colecciones = {
      reparaciones: reparaciones.map(({ reparacionId, costo }) => ({ reparacionId, costo })),
      repuestos: repuestos.map(({ repuestoId, cantidad }) => ({ repuestoId, cantidad: Number(cantidad) })),
    };
    const entrada = inicial ? colecciones : { ...colecciones, numeroPresupuesto: numero };
    startTransition(() => enviar(entrada));
  }

  return (
    <form ref={formulario} onSubmit={guardar} noValidate aria-busy={pendiente} className="min-w-0 space-y-6">
      {estado.errorGeneral ? <p role="alert" tabIndex={-1} className="rounded-md border border-current/30 p-3">{estado.errorGeneral}</p> : null}
      <fieldset disabled={pendiente} className="min-w-0 space-y-6">
        <legend className="sr-only">Datos del presupuesto</legend>
        <div className="space-y-2">
          <label htmlFor="numero-presupuesto" className="block font-medium">Número de presupuesto (obligatorio)</label>
          <Input id="numero-presupuesto" value={numero} onChange={(evento) => setNumero(evento.target.value)} readOnly={Boolean(inicial)} required aria-invalid={Boolean(estado.errores.numeroPresupuesto)} aria-describedby="ayuda-numero-presupuesto error-numero-presupuesto" />
          <p id="ayuda-numero-presupuesto" className="text-sm">El número y el siniestro no pueden modificarse después del alta.</p>
          <p id="error-numero-presupuesto" className="text-sm">{estado.errores.numeroPresupuesto}</p>
        </div>
        <section aria-labelledby="titulo-reparaciones" aria-describedby={erroresReparaciones.reparaciones ? "error-reparaciones" : undefined} className="min-w-0 space-y-4 rounded-lg border border-current/20 p-4">
          <h2 id="titulo-reparaciones" className="text-xl font-semibold">Reparaciones obligatorias</h2>
          <p className="text-sm">Agregá al menos una reparación. Costo con punto y dos decimales, por ejemplo 0.00.</p>
          <SelectorCatalogoPresupuesto tipo="reparaciones" inicial={catalogoReparaciones} seleccionados={reparaciones.map(({ reparacionId }) => reparacionId)} disabled={pendiente} onAgregar={(opcion) => {
            setReparaciones((actuales) => actuales.some(({ reparacionId }) => reparacionId === opcion.id) ? actuales : [...actuales, { reparacionId: opcion.id, nombre: opcion.nombre, costo: "" }]);
            setRespuestaSinErroresReparaciones(estado);
          }} />
          {reparaciones.length === 0 ? <p>No incorporaste reparaciones.</p> : null}
          {reparaciones.map((detalle, indice) => {
            const errorCosto = erroresReparaciones[`reparaciones.${indice}.costo`];
            const errorId = erroresReparaciones[`reparaciones.${indice}.reparacionId`];
            return (
              <div key={detalle.reparacionId} className="min-w-0 space-y-2 border-t border-current/20 pt-3">
                <p className="break-words font-medium">{detalle.nombre}</p>
                <label htmlFor={`costo-${detalle.reparacionId}`} className="block break-words">Costo de {detalle.nombre}</label>
                <Input id={`costo-${detalle.reparacionId}`} value={detalle.costo} inputMode="decimal" required aria-invalid={Boolean(errorCosto)} aria-describedby={errorCosto ? `error-costo-${detalle.reparacionId}` : undefined} onChange={(evento) => setReparaciones((actuales) => actuales.map((fila) => fila.reparacionId === detalle.reparacionId ? { ...fila, costo: evento.target.value } : fila))} />
                {errorCosto ? <p id={`error-costo-${detalle.reparacionId}`} className="text-sm">{errorCosto}</p> : null}
                <Button type="button" variant="outline" disabled={reparaciones.length === 1} aria-label={`Quitar reparación ${detalle.nombre}`} onClick={() => {
                  setReparaciones((actuales) => actuales.filter(({ reparacionId }) => reparacionId !== detalle.reparacionId));
                  setRespuestaSinErroresReparaciones(estado);
                }}>Quitar reparación</Button>
                {errorId ? <p role="alert">{errorId}</p> : null}
              </div>
            );
          })}
          {erroresReparaciones.reparaciones ? <p id="error-reparaciones" role="alert">{erroresReparaciones.reparaciones}</p> : null}
        </section>
        <section aria-labelledby="titulo-repuestos" aria-describedby={erroresRepuestos.repuestos ? "error-repuestos" : undefined} className="min-w-0 space-y-4 rounded-lg border border-current/20 p-4">
          <h2 id="titulo-repuestos" className="text-xl font-semibold">Repuestos opcionales</h2>
          <SelectorCatalogoPresupuesto tipo="repuestos" inicial={catalogoRepuestos} seleccionados={repuestos.map(({ repuestoId }) => repuestoId)} disabled={pendiente} onAgregar={(opcion) => {
            setRepuestos((actuales) => actuales.some(({ repuestoId }) => repuestoId === opcion.id) ? actuales : [...actuales, { repuestoId: opcion.id, nombre: opcion.nombre, cantidad: "1" }]);
            setRespuestaSinErroresRepuestos(estado);
          }} />
          {repuestos.length === 0 ? <p>No incorporaste repuestos.</p> : null}
          {repuestos.map((detalle, indice) => {
            const errorCantidad = erroresRepuestos[`repuestos.${indice}.cantidad`];
            const errorId = erroresRepuestos[`repuestos.${indice}.repuestoId`];
            return (
              <div key={detalle.repuestoId} className="min-w-0 space-y-2 border-t border-current/20 pt-3">
                <p className="break-words font-medium">{detalle.nombre}</p>
                <label htmlFor={`cantidad-${detalle.repuestoId}`} className="block break-words">Cantidad de {detalle.nombre}</label>
                <Input id={`cantidad-${detalle.repuestoId}`} value={detalle.cantidad} type="number" min="1" step="1" required aria-invalid={Boolean(errorCantidad)} aria-describedby={errorCantidad ? `error-cantidad-${detalle.repuestoId}` : undefined} onChange={(evento) => setRepuestos((actuales) => actuales.map((fila) => fila.repuestoId === detalle.repuestoId ? { ...fila, cantidad: evento.target.value } : fila))} />
                {errorCantidad ? <p id={`error-cantidad-${detalle.repuestoId}`} className="text-sm">{errorCantidad}</p> : null}
                <Button type="button" variant="outline" aria-label={`Quitar repuesto ${detalle.nombre}`} onClick={() => {
                  setRepuestos((actuales) => actuales.filter(({ repuestoId }) => repuestoId !== detalle.repuestoId));
                  setRespuestaSinErroresRepuestos(estado);
                }}>Quitar repuesto</Button>
                {errorId ? <p role="alert">{errorId}</p> : null}
              </div>
            );
          })}
          {erroresRepuestos.repuestos ? <p id="error-repuestos" role="alert">{erroresRepuestos.repuestos}</p> : null}
        </section>
      </fieldset>
      <p aria-live="polite" className="break-words">Total de reparaciones: {total ?? "Completá los costos con el formato indicado."}</p>
      <p className="text-sm">Los repuestos no integran el total. Los cambios se guardan únicamente al confirmar.</p>
      <p role="status">{pendiente ? "Guardando… Esperá el resultado antes de salir." : null}</p>
      <Button type="submit" disabled={pendiente} className="w-full sm:w-auto">{pendiente ? "Guardando…" : "Guardar borrador"}</Button>
    </form>
  );
}
