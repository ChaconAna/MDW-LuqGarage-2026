"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";

import { darDeBajaClienteAction, type EstadoBajaCliente } from "@/app/(app)/clientes/[id]/actions";
import { Button } from "@/components/ui/button";

type BajaClienteProps = {
  clienteId: string;
  activo: boolean;
};

const estadoInicial: EstadoBajaCliente = {};

export default function BajaCliente({ clienteId, activo }: BajaClienteProps) {
  const [confirmando, setConfirmando] = useState(false);
  const bloqueo = useRef(false);
  const botonBaja = useRef<HTMLButtonElement>(null);
  const botonConfirmar = useRef<HTMLButtonElement>(null);
  const mensaje = useRef<HTMLParagraphElement>(null);
  const [resultado, enviar, pendiente] = useActionState(async (): Promise<EstadoBajaCliente> => {
    try {
      return await darDeBajaClienteAction({ id: clienteId, confirmado: true });
    } catch {
      return { errorGeneral: "No pudimos confirmar la baja. Actualizá el detalle antes de volver a intentarlo." };
    }
  }, estadoInicial);
  const disponible = activo && !resultado.inactivo;

  useEffect(() => {
    if (confirmando) botonConfirmar.current?.focus();
  }, [confirmando]);

  useEffect(() => {
    if (!pendiente) {
      bloqueo.current = false;
      if (resultado.errorGeneral || resultado.mensajeExito) {
        setConfirmando(false);
        mensaje.current?.focus();
      }
    }
  }, [pendiente, resultado]);

  function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!confirmando || !disponible || pendiente || bloqueo.current) return;
    bloqueo.current = true;
    startTransition(() => enviar());
  }

  return (
    <section aria-labelledby="baja-cliente-titulo" className="space-y-4 rounded-lg border border-current/20 p-4">
      <h2 id="baja-cliente-titulo" className="text-xl font-semibold">Baja del cliente</h2>
      {resultado.errorGeneral ? <p ref={mensaje} role="alert" tabIndex={-1}>{resultado.errorGeneral}</p> : null}
      {resultado.mensajeExito ? <p ref={mensaje} role="status" tabIndex={-1}>{resultado.mensajeExito}</p> : null}
      {!disponible && !resultado.mensajeExito ? (
        <p>Este cliente está inactivo. Sus datos e historial se conservan y no puede utilizarse en nuevas operaciones.</p>
      ) : null}
      {disponible ? (
        <form onSubmit={confirmar} aria-busy={pendiente}>
          <fieldset disabled={pendiente} className="space-y-3">
            <Button ref={botonBaja} type="button" variant="outline" onClick={() => setConfirmando(true)}>
              Dar de baja
            </Button>
            {confirmando ? (
              <div role="group" aria-labelledby="confirmar-baja-titulo" aria-describedby="confirmar-baja-descripcion" className="space-y-3">
                <h3 id="confirmar-baja-titulo" className="font-semibold">¿Confirmás la baja de este cliente?</h3>
                <p id="confirmar-baja-descripcion">Quedará inactivo y no podrá utilizarse en nuevas operaciones. Permanecerá visible en el listado y conservará su historial.</p>
                <div className="flex flex-wrap gap-3">
                  <Button ref={botonConfirmar} type="submit">Confirmar baja</Button>
                  <Button type="button" variant="outline" onClick={() => {
                    if (pendiente || bloqueo.current) return;
                    setConfirmando(false);
                    botonBaja.current?.focus();
                  }}>Cancelar</Button>
                </div>
              </div>
            ) : null}
          </fieldset>
        </form>
      ) : null}
      {pendiente ? <p role="status">Dando de baja al cliente…</p> : null}
    </section>
  );
}
