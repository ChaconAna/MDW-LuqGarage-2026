"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { GradoDano, TipoDocumentoSiniestro } from "@prisma/client";

import { registrarSiniestroAction } from "@/app/(app)/siniestros/nuevo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DatosCreacionSiniestroMultipart } from "@/lib/schemas/siniestro";
import {
  construirMultipartRegistroSiniestro,
  LIMITE_ENVIO_SINIESTRO_BYTES,
  MENSAJE_LIMITE_SINIESTRO,
  medirEnvioRegistroSiniestro,
  type EstadoRegistroSiniestro,
} from "@/lib/services/registroSiniestroFormulario";
import { useNavegacionSelectores, type SeleccionesValidas } from "./NavegacionSelectores";

const estadoInicial: EstadoRegistroSiniestro = { errores: {} };

async function validarYEnviar(
  anterior: EstadoRegistroSiniestro,
  formData: FormData,
): Promise<EstadoRegistroSiniestro> {
  let tamano: number;
  try {
    tamano = await medirEnvioRegistroSiniestro(formData);
  } catch {
    return { errores: {}, errorGeneral: "No pudimos preparar los archivos para el envío. Revisá la selección e intentá nuevamente." };
  }
  if (tamano > LIMITE_ENVIO_SINIESTRO_BYTES) {
    return { errores: {}, errorGeneral: MENSAJE_LIMITE_SINIESTRO };
  }
  // La redirección de éxito pertenece a la Action y debe propagarse sin capturarla.
  return registrarSiniestroAction(anterior, formData);
}

const documentosObligatorios = [
  { tipo: TipoDocumentoSiniestro.DENUNCIA, etiqueta: "Foto de la denuncia" },
  { tipo: TipoDocumentoSiniestro.LATERAL_DERECHA, etiqueta: "Foto lateral derecha" },
  { tipo: TipoDocumentoSiniestro.LATERAL_IZQUIERDA, etiqueta: "Foto lateral izquierda" },
  { tipo: TipoDocumentoSiniestro.FRONTAL, etiqueta: "Foto frontal" },
  { tipo: TipoDocumentoSiniestro.TRASERA, etiqueta: "Foto trasera" },
  {
    tipo: TipoDocumentoSiniestro.CERTIFICADO_COBERTURA,
    etiqueta: "Foto del certificado de cobertura",
  },
] as const;

const etiquetasGrado: Record<GradoDano, string> = {
  LEVE: "Leve",
  MODERADO: "Moderado",
  GRAVE: "Grave",
};

type TipoObligatorio = (typeof documentosObligatorios)[number]["tipo"];
type FormularioRegistroSiniestroProps = {
  selectorCliente: ReactNode;
  selectorVehiculo: ReactNode;
  selectorAseguradora: ReactNode;
  seleccionesValidas: SeleccionesValidas;
};

export default function FormularioRegistroSiniestro({
  selectorCliente,
  selectorVehiculo,
  selectorAseguradora,
  seleccionesValidas,
}: FormularioRegistroSiniestroProps) {
  const [numeroSiniestro, setNumeroSiniestro] = useState("");
  const [fechaSiniestro, setFechaSiniestro] = useState("");
  const [gradoDano, setGradoDano] = useState<GradoDano | "">("");
  const [numeroPoliza, setNumeroPoliza] = useState("");
  const [documentos, setDocumentos] = useState<
    Partial<Record<TipoObligatorio, File>>
  >({});
  const [adicionales, setAdicionales] = useState<File[]>([]);
  const [estado, enviar, pendienteEnvio] = useActionState(validarYEnviar, estadoInicial);
  const { pendiente: pendienteSeleccion } = useNavegacionSelectores();
  const bloqueoEnvio = useRef(false);
  const formulario = useRef<HTMLFormElement>(null);
  const errores = estado.errores;
  const errorGeneral = estado.errorGeneral ?? (
    Object.keys(errores).length > 0 ? "Revisá los campos indicados." : undefined
  );
  const formularioCompleto = Boolean(
    numeroSiniestro && fechaSiniestro && gradoDano && numeroPoliza &&
    seleccionesValidas.clienteId && seleccionesValidas.vehiculoId && seleccionesValidas.aseguradoraId &&
    documentosObligatorios.every(({ tipo }) => documentos[tipo]),
  );

  useEffect(() => {
    if (!pendienteEnvio) {
      bloqueoEnvio.current = false;
      if (Object.keys(estado.errores).length > 0) {
        formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      }
    }
  }, [pendienteEnvio, estado]);

  function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (bloqueoEnvio.current || pendienteEnvio || pendienteSeleccion || !formularioCompleto) return;
    bloqueoEnvio.current = true;

    const archivos: DatosCreacionSiniestroMultipart["documentos"] = [];
    for (const { tipo } of documentosObligatorios) {
      const archivo = documentos[tipo];
      if (archivo) archivos.push({ tipo, archivo });
    }
    archivos.push(...adicionales.map((archivo) => ({ tipo: TipoDocumentoSiniestro.ADICIONAL, archivo })));
    const formData = construirMultipartRegistroSiniestro({
      numeroSiniestro, fechaSiniestro, gradoDano, numeroPoliza,
      clienteId: seleccionesValidas.clienteId ?? "",
      vehiculoId: seleccionesValidas.vehiculoId ?? "",
      aseguradoraId: seleccionesValidas.aseguradoraId ?? "",
    }, archivos);

    // El envío manual evita que React reinicie los inputs de archivos al devolver errores.
    startTransition(() => enviar(formData));
  }

  return (
    <form
      ref={formulario}
      id="formulario-registro-siniestro"
      className="min-w-0 space-y-6"
      aria-describedby="ayuda-registro-siniestro"
      aria-busy={pendienteEnvio}
      onSubmit={registrar}
    >
      <p id="ayuda-registro-siniestro">
        Completá los datos, seleccioná las tres entidades y adjuntá la documentación.
        Todos los datos son obligatorios, salvo las fotografías adicionales.
      </p>

      {errorGeneral ? <p role="alert">{errorGeneral}</p> : null}

      <fieldset disabled={pendienteEnvio} className="min-w-0 space-y-4 rounded-lg border border-current/20 p-4">
        <legend className="px-1 text-xl font-semibold">Datos del siniestro</legend>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <label htmlFor="numero-siniestro" className="block font-medium">
              Número de siniestro (obligatorio)
            </label>
            <Input
              id="numero-siniestro"
              name="numeroSiniestro"
              type="text"
              required
              value={numeroSiniestro}
              onChange={(evento) => setNumeroSiniestro(evento.target.value)}
              aria-invalid={Boolean(errores.numeroSiniestro)}
              aria-describedby={errores.numeroSiniestro ? "error-numero-siniestro" : undefined}
            />
            {errores.numeroSiniestro ? (
              <p id="error-numero-siniestro" className="text-sm">{errores.numeroSiniestro}</p>
            ) : null}
          </div>

          <div className="min-w-0 space-y-2">
            <label htmlFor="fecha-siniestro" className="block font-medium">
              Fecha del siniestro (obligatoria)
            </label>
            <Input
              id="fecha-siniestro"
              name="fechaSiniestro"
              type="date"
              required
              value={fechaSiniestro}
              onChange={(evento) => setFechaSiniestro(evento.target.value)}
              aria-invalid={Boolean(errores.fechaSiniestro)}
              aria-describedby={errores.fechaSiniestro ? "error-fecha-siniestro" : undefined}
            />
            {errores.fechaSiniestro ? (
              <p id="error-fecha-siniestro" className="text-sm">{errores.fechaSiniestro}</p>
            ) : null}
          </div>

          <div className="min-w-0 space-y-2 sm:col-span-2">
            <label htmlFor="numero-poliza" className="block font-medium">
              Número de póliza (obligatorio)
            </label>
            <Input
              id="numero-poliza"
              name="numeroPoliza"
              type="text"
              required
              value={numeroPoliza}
              onChange={(evento) => setNumeroPoliza(evento.target.value)}
              aria-invalid={Boolean(errores.numeroPoliza)}
              aria-describedby={errores.numeroPoliza ? "error-numero-poliza" : undefined}
            />
            {errores.numeroPoliza ? (
              <p id="error-numero-poliza" className="text-sm">{errores.numeroPoliza}</p>
            ) : null}
          </div>
        </div>

        <fieldset
          className="min-w-0 space-y-2"
          aria-describedby={errores.gradoDano ? "error-grado-dano" : undefined}
        >
          <legend className="font-medium">Grado de daño (obligatorio)</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {Object.values(GradoDano).map((grado) => (
              <label key={grado} htmlFor={`grado-${grado}`} className="flex items-center gap-2">
                <Input
                  id={`grado-${grado}`}
                  type="radio"
                  name="gradoDano"
                  value={grado}
                  required
                  checked={gradoDano === grado}
                  onChange={() => setGradoDano(grado)}
                  aria-invalid={Boolean(errores.gradoDano)}
                  className="h-4 w-4 shrink-0 rounded-full p-0 shadow-none"
                />
                {etiquetasGrado[grado]}
              </label>
            ))}
          </div>
          {errores.gradoDano ? (
            <p id="error-grado-dano" className="text-sm">{errores.gradoDano}</p>
          ) : null}
        </fieldset>
        <p className="text-sm opacity-75">
          La fecha de registro y el estado inicial se generarán al guardar.
        </p>
      </fieldset>

      <fieldset
        disabled={pendienteEnvio}
        aria-label="Cliente, vehículo y aseguradora obligatorios"
        className="min-w-0 space-y-6"
        onClickCapture={(evento) => {
          if (pendienteEnvio) evento.preventDefault();
        }}
      >
        <div role="group" aria-label="Selección de cliente" aria-describedby={errores.clienteId ? "error-cliente-activo" : undefined} className="space-y-3">
          {selectorCliente}
          {errores.clienteId ? <p id="error-cliente-activo" role="alert">Cliente: {errores.clienteId}</p> : null}
        </div>
        <div role="group" aria-label="Selección de vehículo" aria-describedby={errores.vehiculoId ? "error-vehiculo-activo" : undefined} className="space-y-3">
          {selectorVehiculo}
          {errores.vehiculoId ? <p id="error-vehiculo-activo" role="alert">Vehículo: {errores.vehiculoId}</p> : null}
        </div>
        <div role="group" aria-label="Selección de aseguradora" aria-describedby={errores.aseguradoraId ? "error-aseguradora-activa" : undefined} className="space-y-3">
          {selectorAseguradora}
          {errores.aseguradoraId ? <p id="error-aseguradora-activa" role="alert">Aseguradora: {errores.aseguradoraId}</p> : null}
        </div>
      </fieldset>

      <fieldset disabled={pendienteEnvio} aria-describedby={errores.documentos ? "error-documentos" : undefined} className="min-w-0 space-y-4 rounded-lg border border-current/20 p-4">
        <legend className="px-1 text-xl font-semibold">Documentación obligatoria</legend>
        <p id="ayuda-documentos" className="text-sm">
          Seleccioná una foto por categoría. Podés reemplazarla antes de registrar.
        </p>
        <p id="ayuda-archivos" className="text-sm opacity-75">
          Los archivos quedan solo en esta pantalla. Si recargás o salís, deberás
          seleccionarlos nuevamente.
        </p>

        {documentosObligatorios.map(({ tipo, etiqueta }) => (
          <div key={tipo} className="min-w-0 space-y-2">
            <label htmlFor={`documento-${tipo}`} className="block font-medium">
              {etiqueta} (obligatoria)
            </label>
            <Input
              id={`documento-${tipo}`}
              name={`documento-${tipo}`}
              type="file"
              accept="image/*"
              required
              onChange={(evento) => {
                const archivo = evento.target.files?.[0];
                setDocumentos((actuales) => ({ ...actuales, [tipo]: archivo }));
              }}
              aria-invalid={Boolean(errores[tipo])}
              aria-describedby={`ayuda-documentos ayuda-archivos archivo-${tipo}${errores[tipo] ? ` error-${tipo}` : ""}`}
              className="h-auto max-w-full py-2 text-sm"
            />
            <p id={`archivo-${tipo}`} className="break-all text-sm">
              {documentos[tipo] ? `Seleccionado: ${documentos[tipo].name}` : "Ningún archivo seleccionado."}
            </p>
            {errores[tipo] ? <p id={`error-${tipo}`} className="text-sm">{errores[tipo]}</p> : null}
          </div>
        ))}
        {errores.documentos ? <p id="error-documentos" role="alert">{errores.documentos}</p> : null}
      </fieldset>

      <fieldset disabled={pendienteEnvio} className="min-w-0 space-y-3 rounded-lg border border-current/20 p-4">
        <legend className="px-1 text-xl font-semibold">Fotografías adicionales (opcional)</legend>
        <label htmlFor="documentos-adicionales" className="block font-medium">
          Seleccionar fotografías adicionales
        </label>
        <Input
          id="documentos-adicionales"
          name="documentosAdicionales"
          type="file"
          accept="image/*"
          multiple
          onChange={(evento) => {
            const archivos = Array.from(evento.target.files ?? []);
            setAdicionales(archivos);
          }}
          aria-invalid={Boolean(errores.ADICIONAL)}
          aria-describedby={`ayuda-adicionales ayuda-archivos${errores.ADICIONAL ? " error-adicionales" : ""}`}
          className="h-auto max-w-full py-2 text-sm"
        />
        <p id="ayuda-adicionales" className="text-sm">
          Podés seleccionar varias fotos. Volver a elegir archivos reemplaza esta selección.
        </p>
        {adicionales.length === 0 ? (
          <p className="text-sm">No seleccionaste fotografías adicionales.</p>
        ) : (
          <ul className="min-w-0 list-inside list-disc text-sm">
            {adicionales.map((archivo, indice) => (
              <li key={`${archivo.name}-${indice}`} className="break-all">{archivo.name}</li>
            ))}
          </ul>
        )}
        {errores.ADICIONAL ? <p id="error-adicionales" className="text-sm">{errores.ADICIONAL}</p> : null}
      </fieldset>

      <div className="space-y-3">
        <p id="ayuda-envio" className="text-sm">
          Completá los datos obligatorios y las tres selecciones. Máximo total: 4 MiB entre datos y archivos.
        </p>
        <p role="status" className="text-sm">
          {pendienteEnvio ? "Registrando… Esperá el resultado antes de salir de esta pantalla." :
            pendienteSeleccion ? "Esperá a que termine de actualizarse la selección." : null}
        </p>
        <Button
          type="submit"
          disabled={!formularioCompleto || pendienteEnvio || pendienteSeleccion}
          aria-describedby="ayuda-envio"
          className="w-full sm:w-auto"
        >
          {pendienteEnvio ? "Registrando…" : "Registrar siniestro"}
        </Button>
      </div>
    </form>
  );
}
