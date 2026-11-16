"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";

import {
  crearClienteAction,
  type EstadoFormularioCliente,
  type PaginaLocalidadesFormulario,
} from "@/app/(app)/clientes/nuevo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DatosCreacionCliente } from "@/lib/schemas/cliente";

import SelectorLocalidad, {
  type LocalidadSeleccionada,
} from "./SelectorLocalidad";

type CampoTextoCliente = Exclude<keyof DatosCreacionCliente, "localidadId">;

type FormularioClienteProps = {
  localidadesIniciales: PaginaLocalidadesFormulario;
};

const estadoInicial: EstadoFormularioCliente = { errores: {} };

const campos: ReadonlyArray<{
  nombre: CampoTextoCliente;
  etiqueta: string;
}> = [
  { nombre: "nombre", etiqueta: "Nombre" },
  { nombre: "apellido", etiqueta: "Apellido" },
  { nombre: "dni", etiqueta: "DNI" },
  { nombre: "telefono", etiqueta: "Teléfono" },
  { nombre: "email", etiqueta: "Email" },
  { nombre: "direccion", etiqueta: "Dirección" },
];

const textosIniciales = {
  nombre: "",
  apellido: "",
  dni: "",
  telefono: "",
  email: "",
  direccion: "",
} satisfies Record<CampoTextoCliente, string>;

export default function FormularioCliente({
  localidadesIniciales,
}: FormularioClienteProps) {
  const [textos, setTextos] = useState(textosIniciales);
  const [localidad, setLocalidad] = useState<LocalidadSeleccionada>();
  const [estado, enviar, pendiente] = useActionState(
    crearClienteAction,
    estadoInicial,
  );
  const bloqueoEnvio = useRef(false);
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pendiente) {
      bloqueoEnvio.current = false;
      if (Object.keys(estado.errores).length > 0) {
        formulario.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus();
      }
    }
  }, [pendiente, estado]);

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (bloqueoEnvio.current || pendiente) return;

    bloqueoEnvio.current = true;
    startTransition(() =>
      enviar({
        ...textos,
        localidadId: localidad?.id ?? "",
      }),
    );
  }

  return (
    <form
      ref={formulario}
      onSubmit={guardar}
      noValidate
      aria-busy={pendiente}
      className="min-w-0 space-y-6"
    >
      <p>
        Todos los campos son obligatorios. La Provincia se completa a partir de
        la Localidad.
      </p>

      {estado.errorGeneral ? (
        <p
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-current/30 p-3"
        >
          {estado.errorGeneral}
        </p>
      ) : null}

      <fieldset
        disabled={pendiente}
        className="min-w-0 space-y-4 rounded-lg border border-current/20 p-4"
      >
        <legend className="px-1 text-xl font-semibold">Datos del cliente</legend>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {campos.map(({ nombre, etiqueta }) => {
            const error = estado.errores[nombre];
            const id = `cliente-${nombre}`;
            const idError = `error-cliente-${nombre}`;

            return (
              <div key={nombre} className="min-w-0 space-y-2">
                <label htmlFor={id} className="block font-medium">
                  {etiqueta} (obligatorio)
                </label>
                <Input
                  id={id}
                  name={nombre}
                  type="text"
                  required
                  value={textos[nombre]}
                  onChange={(evento) =>
                    setTextos((actuales) => ({
                      ...actuales,
                      [nombre]: evento.target.value,
                    }))
                  }
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? idError : undefined}
                />
                {error ? (
                  <p id={idError} className="text-sm">
                    {error}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </fieldset>

      <SelectorLocalidad
        inicial={localidadesIniciales}
        seleccionada={localidad}
        disabled={pendiente}
        error={estado.errores.localidadId}
        onSeleccionar={setLocalidad}
      />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando cliente…" : "Guardar cliente"}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/clientes">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
