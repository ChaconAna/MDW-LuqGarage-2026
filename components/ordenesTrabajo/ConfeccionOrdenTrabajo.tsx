"use client";

import { startTransition, useActionState, useCallback, useEffect, useRef, useState } from "react";
import { guardarObservacionesOrdenTrabajoAction, finalizarOrdenTrabajoAction, type EstadoCreacionOrdenTrabajo } from "@/app/(app)/ordenes-trabajo/actions";
import type { DatosActualizacionObservacionesOrdenTrabajo } from "@/lib/schemas/ordenTrabajo";
import { Button } from "@/components/ui/button";
import DetalleOrdenTrabajo from "./DetalleOrdenTrabajo";
import FormularioOrdenTrabajo from "./FormularioOrdenTrabajo";

type Orden = NonNullable<EstadoCreacionOrdenTrabajo["ordenTrabajo"]>;
type Props = { inicialOrden: Orden; catalogoInicial: Parameters<typeof FormularioOrdenTrabajo>[0]["inicial"] };
type Operacion = { tipo: "observaciones"; datos: DatosActualizacionObservacionesOrdenTrabajo } | { tipo: "finalizar" };

export default function ConfeccionOrdenTrabajo({ inicialOrden, catalogoInicial }: Props) {
  const [orden, setOrden] = useState(inicialOrden);
  const [cambios, setCambios] = useState<Record<string, string>>({});
  const [actividadSelector, setActividadSelector] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string>();
  const bloqueo = useRef(false);
  const confirmar = useRef<HTMLButtonElement>(null);
  const abrirConfirmacion = useRef<HTMLButtonElement>(null);
  const mensaje = useRef<HTMLParagraphElement>(null);
  const [resultado, enviar, pendiente] = useActionState(async (_anterior: EstadoCreacionOrdenTrabajo, operacion: Operacion) => {
    let respuesta: EstadoCreacionOrdenTrabajo;
    try {
      respuesta = operacion.tipo === "observaciones"
        ? await guardarObservacionesOrdenTrabajoAction(orden.id, operacion.datos)
        : await finalizarOrdenTrabajoAction(orden.id);
    } catch { respuesta = { errorGeneral: "No pudimos confirmar el guardado. Actualizá el detalle antes de volver a intentarlo." }; }
    if (respuesta.ordenTrabajo) { setOrden(respuesta.ordenTrabajo); setCambios({}); }
    setMensajeExito(respuesta.mensajeExito);
    setConfirmando(false);
    return respuesta;
  }, {} as EstadoCreacionOrdenTrabajo);
  const ocupada = pendiente || actividadSelector;
  const sectoresModificados = orden.sectores.filter((sector) => cambios[sector.id] !== undefined && cambios[sector.id] !== (sector.observacion ?? ""));
  const sinGuardar = sectoresModificados.length > 0;

  useEffect(() => { setOrden(inicialOrden); }, [inicialOrden]);
  useEffect(() => {
    if (!ocupada) {
      bloqueo.current = false;
      if (resultado.errorGeneral || mensajeExito) mensaje.current?.focus();
    }
  }, [ocupada, resultado, mensajeExito]);
  useEffect(() => { if (confirmando) confirmar.current?.focus(); }, [confirmando]);
  const incorporados = useCallback((actualizada: Orden) => {
    setOrden(actualizada);
    setMensajeExito("Los presupuestos se incorporaron a la orden de trabajo.");
  }, []);

  function ejecutar(operacion: Operacion) {
    if (bloqueo.current || ocupada || orden.estado !== "BORRADOR") return;
    if (operacion.tipo === "finalizar" && (!confirmando || sinGuardar)) return;
    bloqueo.current = true;
    setMensajeExito(undefined);
    startTransition(() => enviar(operacion));
  }

  return <DetalleOrdenTrabajo orden={orden} esEncargado>
    {resultado.errorGeneral && !mensajeExito ? <p ref={mensaje} role="alert" tabIndex={-1}>{resultado.errorGeneral}</p> : null}
    {mensajeExito ? <p ref={mensaje} role="status" tabIndex={-1}>{mensajeExito}</p> : null}
    {orden.estado === "BORRADOR" ? <div className="space-y-6" aria-busy={ocupada}>
      <section aria-labelledby="observaciones-ot" className="min-w-0 space-y-4 rounded-lg border border-current/20 p-4">
        <h2 id="observaciones-ot" className="text-xl font-semibold">Observaciones por sector</h2>
        <form aria-label="Guardar observaciones" onSubmit={(event) => {
          event.preventDefault();
          if (!sinGuardar) return;
          ejecutar({ tipo: "observaciones", datos: { sectores: sectoresModificados.map((sector) => ({ sectorId: sector.id, observacion: cambios[sector.id] === "" ? null : cambios[sector.id]! })) } });
        }}>
          <fieldset disabled={ocupada} className="min-w-0 space-y-4">
            <legend className="sr-only">Editar observaciones de la orden de trabajo</legend>
            {orden.sectores.map((sector) => <div key={sector.id} className="space-y-2">
              <label htmlFor={`observacion-${sector.id}`} className="block font-medium">Observación de {sector.nombre}</label>
              <textarea id={`observacion-${sector.id}`} value={cambios[sector.id] ?? sector.observacion ?? ""} rows={3}
                aria-invalid={Boolean(resultado.errorObservaciones && !mensajeExito)} aria-describedby={resultado.errorObservaciones && !mensajeExito ? "error-observaciones" : undefined}
                className="block w-full min-w-0 rounded-md border border-current/30 bg-transparent p-3 focus-visible:outline-2 focus-visible:outline-offset-2"
                onChange={(event) => {
                  if (bloqueo.current || ocupada) return;
                  setCambios((actuales) => ({ ...actuales, [sector.id]: event.target.value }));
                  setConfirmando(false);
                }} />
            </div>)}
            {resultado.errorObservaciones && !mensajeExito ? <p id="error-observaciones" role="alert">{resultado.errorObservaciones}</p> : null}
            {orden.sectores.length === 0 ? <p>No hay sectores cuyas observaciones puedan editarse.</p> : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button type="submit" disabled={!sinGuardar}>{pendiente ? "Guardando…" : "Guardar observaciones"}</Button>
              <Button type="button" variant="outline" disabled={!sinGuardar} onClick={() => { if (!bloqueo.current && !ocupada) setCambios({}); }}>Descartar cambios</Button>
            </div>
          </fieldset>
        </form>
        {sinGuardar ? <p role="status">Hay observaciones sin guardar. Guardá o descartá los cambios antes de incorporar presupuestos o finalizar.</p> : null}
      </section>
      <section aria-labelledby="incorporar-ot" className="min-w-0 space-y-4 rounded-lg border border-current/20 p-4">
        <h2 id="incorporar-ot" className="text-xl font-semibold">Incorporar presupuestos</h2>
        <p>Los presupuestos ya incluidos se conservan y no pueden quitarse ni reasignarse.</p>
        <FormularioOrdenTrabajo siniestroId={orden.siniestro.id} inicial={catalogoInicial} incorporacion={{
          ordenTrabajoId: orden.id, bloqueado: pendiente || sinGuardar, bloqueo, onActividad: setActividadSelector, onGuardado: incorporados,
        }} />
      </section>
      <section aria-labelledby="finalizar-ot" className="space-y-4 rounded-lg border border-current/20 p-4">
        <h2 id="finalizar-ot" className="text-xl font-semibold">Finalizar confección</h2>
        <p id="ayuda-finalizar-ot">Esta operación concluye la confección administrativa y habilita la consulta del Mecánico. No representa la ejecución física de las reparaciones. La orden no podrá reabrirse.</p>
        <form aria-label="Finalizar orden de trabajo" onSubmit={(event) => { event.preventDefault(); ejecutar({ tipo: "finalizar" }); }} aria-describedby="ayuda-finalizar-ot">
          <fieldset disabled={ocupada || sinGuardar} className="min-w-0 space-y-4">
            <legend className="sr-only">Finalización de orden de trabajo</legend>
            <Button ref={abrirConfirmacion} type="button" variant="outline" onClick={() => { if (!bloqueo.current && !ocupada && !sinGuardar) setConfirmando(true); }}>Finalizar orden de trabajo</Button>
            {confirmando ? <div role="group" aria-labelledby="confirmar-finalizacion" className="space-y-3">
              <h3 id="confirmar-finalizacion" className="font-semibold">Confirmar estado FINALIZADA</h3>
              <p>Se registrará la orden como FINALIZADA y se retirarán los controles de edición.</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button ref={confirmar} type="submit">Confirmar FINALIZADA</Button>
                <Button type="button" variant="outline" onClick={() => {
                  if (bloqueo.current || ocupada) return;
                  setConfirmando(false); abrirConfirmacion.current?.focus();
                }}>Cancelar</Button>
              </div>
            </div> : null}
          </fieldset>
        </form>
      </section>
      <p role="status">{pendiente ? "Guardando cambios en la orden de trabajo…" : actividadSelector ? "Procesando selección de presupuestos…" : null}</p>
    </div> : null}
  </DetalleOrdenTrabajo>;
}
