"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import type { EstadoPresupuesto } from "@prisma/client";

import {
  registrarEnvioPresupuestoAction,
  registrarAprobacionPresupuestoAction,
  registrarRechazoPresupuestoAction,
  type EstadoTransicionPresupuesto,
} from "@/app/(app)/presupuestos/actions";
import { Button } from "@/components/ui/button";

const operaciones = {
  envio: {
    etiqueta: "Registrar envío externo",
    destino: "ENVIADO",
    origen: "BORRADOR",
    pendiente: "Registrando envío externo…",
    accion: registrarEnvioPresupuestoAction,
  },
  aprobacion: {
    etiqueta: "Registrar aprobación",
    destino: "APROBADO",
    origen: "ENVIADO",
    pendiente: "Registrando aprobación…",
    accion: registrarAprobacionPresupuestoAction,
  },
  rechazo: {
    etiqueta: "Registrar rechazo",
    destino: "RECHAZADO",
    origen: "ENVIADO",
    pendiente: "Registrando rechazo…",
    accion: registrarRechazoPresupuestoAction,
  },
} as const satisfies Record<string, {
  etiqueta: string;
  destino: EstadoPresupuesto;
  origen: EstadoPresupuesto;
  pendiente: string;
  accion: typeof registrarEnvioPresupuestoAction;
}>;

type Operacion = keyof typeof operaciones;
type GestionEstadoPresupuestoProps = {
  presupuestoId: string;
  estado: EstadoPresupuesto;
};
const estadoInicial: EstadoTransicionPresupuesto = {};

export default function GestionEstadoPresupuesto({ presupuestoId, estado }: GestionEstadoPresupuestoProps) {
  const [confirmando, setConfirmando] = useState<Operacion | null>(null);
  const bloqueo = useRef(false);
  const origenConfirmacion = useRef<HTMLButtonElement | null>(null);
  const botonConfirmar = useRef<HTMLButtonElement>(null);
  const mensaje = useRef<HTMLParagraphElement>(null);
  const [resultado, enviar, pendiente] = useActionState(
    async (_anterior: EstadoTransicionPresupuesto, operacion: Operacion): Promise<EstadoTransicionPresupuesto> => {
      try {
        return await operaciones[operacion].accion(presupuestoId);
      } catch {
        // Un fallo de transporte puede ocurrir después de persistir; no reintentamos.
        return { errorGeneral: "No pudimos confirmar el registro del estado. Actualizá el detalle antes de volver a intentarlo." };
      }
    },
    estadoInicial,
  );
  const disponibles = (Object.keys(operaciones) as Operacion[]).filter((operacion) => operaciones[operacion].origen === estado);
  const confirmacion = confirmando && (pendiente || disponibles.includes(confirmando)) ? operaciones[confirmando] : null;

  useEffect(() => {
    if (confirmando) botonConfirmar.current?.focus();
  }, [confirmando]);

  useEffect(() => {
    if (!pendiente) {
      bloqueo.current = false;
      if (resultado.errorGeneral || resultado.mensajeExito) {
        setConfirmando(null);
        mensaje.current?.focus();
      }
    }
  }, [pendiente, resultado]);

  function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (bloqueo.current || pendiente || !confirmando || !disponibles.includes(confirmando)) return;
    bloqueo.current = true;
    startTransition(() => enviar(confirmando));
  }

  return (
    <section aria-labelledby="gestion-estado-presupuesto" className="min-w-0 space-y-4 rounded-lg border border-current/20 p-4">
      <h2 id="gestion-estado-presupuesto" className="text-xl font-semibold">Registro de comunicaciones externas</h2>
      <p id="ayuda-transicion-presupuesto" className="text-sm">
        Estas acciones registran comunicaciones realizadas fuera de LuqGarage. Registrá el envío ya realizado o la respuesta recibida de la aseguradora.
      </p>
      {resultado.errorGeneral ? <p ref={mensaje} role="alert" tabIndex={-1}>{resultado.errorGeneral}</p> : null}
      {resultado.mensajeExito ? <p ref={mensaje} role="status" tabIndex={-1}>{resultado.mensajeExito}</p> : null}
      <form onSubmit={confirmar} aria-busy={pendiente} aria-describedby="ayuda-transicion-presupuesto">
        <fieldset disabled={pendiente} className="min-w-0 space-y-4">
          <legend className="sr-only">Operaciones disponibles para el presupuesto</legend>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {disponibles.map((operacion) => <Button
              key={operacion}
              type="button"
              variant={operacion === "rechazo" ? "destructive" : "outline"}
              className="w-full sm:w-auto"
              onClick={(evento) => {
                if (bloqueo.current || pendiente) return;
                origenConfirmacion.current = evento.currentTarget;
                setConfirmando(operacion);
              }}
            >{operaciones[operacion].etiqueta}</Button>)}
          </div>
          {confirmacion ? <div role="group" aria-labelledby="confirmacion-estado-titulo" aria-describedby="confirmacion-estado-descripcion" className="space-y-3 border-t border-current/20 pt-4">
            <h3 id="confirmacion-estado-titulo" className="font-semibold">Confirmar registro de estado</h3>
            <p id="confirmacion-estado-descripcion">Se registrará el estado {confirmacion.destino}. Confirmá únicamente si la comunicación externa ya ocurrió.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button ref={botonConfirmar} type="submit" className="w-full sm:w-auto">Confirmar {confirmacion.destino}</Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => {
                if (bloqueo.current || pendiente) return;
                setConfirmando(null);
                origenConfirmacion.current?.focus();
              }}>Cancelar</Button>
            </div>
          </div> : null}
        </fieldset>
      </form>
      {disponibles.length === 0 ? <p>No hay transiciones disponibles para este estado.</p> : null}
      <p role="status">{pendiente && confirmando ? operaciones[confirmando].pendiente : null}</p>
    </section>
  );
}
