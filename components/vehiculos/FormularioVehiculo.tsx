"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";

import { crearVehiculoAction, type EstadoFormularioVehiculo, type PaginaCatalogoVehiculo } from "@/app/(app)/vehiculos/nuevo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { obtenerVehiculoPorId } from "@/lib/db/vehiculo";
import SelectorCatalogoVehiculo, { type OpcionCatalogoVehiculo } from "./SelectorCatalogoVehiculo";

type FormularioVehiculoProps = {
  marcasIniciales: PaginaCatalogoVehiculo;
  tiposIniciales: PaginaCatalogoVehiculo;
  vehiculoInicial?: NonNullable<Awaited<ReturnType<typeof obtenerVehiculoPorId>>>;
  guardarAction?: typeof crearVehiculoAction;
  hrefCancelar?: string;
};
const estadoInicial: EstadoFormularioVehiculo = { errores: {} };

export default function FormularioVehiculo({ marcasIniciales, tiposIniciales, vehiculoInicial, guardarAction = crearVehiculoAction, hrefCancelar = "/vehiculos" }: FormularioVehiculoProps) {
  const [patente, setPatente] = useState(vehiculoInicial?.patente ?? "");
  const [marca, setMarca] = useState<OpcionCatalogoVehiculo | undefined>(vehiculoInicial?.modelo.marca);
  const [modelo, setModelo] = useState<OpcionCatalogoVehiculo | undefined>(vehiculoInicial?.modelo);
  const [tipoVehiculo, setTipoVehiculo] = useState<OpcionCatalogoVehiculo | undefined>(vehiculoInicial?.tipoVehiculo);
  const [estado, enviar, pendiente] = useActionState(guardarAction, estadoInicial);
  const bloqueo = useRef(false);
  const formulario = useRef<HTMLFormElement>(null);
  const mensaje = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!pendiente) {
      bloqueo.current = false;
      if (estado.errorGeneral) {
        const campo = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)');
        (campo ?? mensaje.current)?.focus();
      }
    }
  }, [pendiente, estado]);

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (bloqueo.current || pendiente) return;
    bloqueo.current = true;
    startTransition(() => enviar({
      patente, marcaId: marca?.id ?? "", modeloId: modelo?.id ?? "", tipoVehiculoId: tipoVehiculo?.id ?? "",
    }));
  }

  return (
    <form ref={formulario} onSubmit={guardar} noValidate aria-busy={pendiente} className="min-w-0 space-y-6">
      <p>Todos los campos son obligatorios. Seleccioná la Marca y luego uno de sus Modelos.</p>
      {estado.errorGeneral ? <p ref={mensaje} role="alert" tabIndex={-1} className="rounded-md border border-current/30 p-3">{estado.errorGeneral}</p> : null}
      <fieldset disabled={pendiente} className="min-w-0 space-y-4">
        <legend className="mb-3 text-xl font-semibold">Datos del vehículo</legend>
        <div className="space-y-2">
          <label htmlFor="vehiculo-patente" className="block font-medium">Patente (obligatoria)</label>
          <Input id="vehiculo-patente" name="patente" type="text" required value={patente} onChange={(evento) => setPatente(evento.target.value)}
            aria-invalid={Boolean(estado.errores.patente)} aria-describedby={estado.errores.patente ? "error-patente" : undefined} />
          {estado.errores.patente ? <p id="error-patente" className="text-sm">{estado.errores.patente}</p> : null}
        </div>
        <SelectorCatalogoVehiculo tipo="marcas" inicial={marcasIniciales} seleccionada={marca} disabled={pendiente} error={estado.errores.marcaId}
          onSeleccionar={(opcion) => { setMarca(opcion); setModelo(undefined); }} />
        <SelectorCatalogoVehiculo key={marca?.id ?? "sin-marca"} tipo="modelos" marcaId={marca?.id}
          inicial={{ opciones: [], total: 0, pagina: 1 }} seleccionada={modelo} disabled={pendiente} error={estado.errores.modeloId} onSeleccionar={setModelo} />
        <SelectorCatalogoVehiculo tipo="tipos" inicial={tiposIniciales} seleccionada={tipoVehiculo} disabled={pendiente} error={estado.errores.tipoVehiculoId} onSeleccionar={setTipoVehiculo} />
        <Button type="submit" disabled={pendiente}>{pendiente ? "Guardando vehículo…" : vehiculoInicial ? "Guardar cambios" : "Guardar vehículo"}</Button>
      </fieldset>
      {pendiente ? <p role="status">Guardando vehículo…</p> : null}
      <Button asChild type="button" variant="outline"><Link href={hrefCancelar}>Cancelar</Link></Button>
    </form>
  );
}
