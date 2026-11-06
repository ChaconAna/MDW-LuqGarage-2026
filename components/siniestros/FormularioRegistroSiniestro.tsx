"use client";

import { useState, type ReactNode } from "react";
import { GradoDano, TipoDocumentoSiniestro } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DatosCreacionSiniestroMultipart } from "@/lib/schemas/siniestro";

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
type CampoError = keyof DatosCreacionSiniestroMultipart | TipoDocumentoSiniestro;

type FormularioRegistroSiniestroProps = {
  children: ReactNode;
  errores?: Partial<Record<CampoError, string>>;
  errorGeneral?: string;
};

export default function FormularioRegistroSiniestro({
  children,
  errores = {},
  errorGeneral,
}: FormularioRegistroSiniestroProps) {
  const [numeroSiniestro, setNumeroSiniestro] = useState("");
  const [fechaSiniestro, setFechaSiniestro] = useState("");
  const [gradoDano, setGradoDano] = useState<GradoDano | "">("");
  const [numeroPoliza, setNumeroPoliza] = useState("");
  const [documentos, setDocumentos] = useState<
    Partial<Record<TipoObligatorio, File>>
  >({});
  const [adicionales, setAdicionales] = useState<File[]>([]);

  return (
    <form
      id="formulario-registro-siniestro"
      className="min-w-0 space-y-6"
      aria-describedby="ayuda-registro-siniestro"
      onSubmit={(evento) => evento.preventDefault()}
    >
      <p id="ayuda-registro-siniestro">
        Completá los datos, seleccioná las tres entidades y adjuntá la documentación.
        Todos los datos son obligatorios, salvo las fotografías adicionales.
      </p>

      {errorGeneral ? <p role="alert">{errorGeneral}</p> : null}

      <fieldset className="min-w-0 space-y-4 rounded-lg border border-current/20 p-4">
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

      <section aria-label="Cliente, vehículo y aseguradora obligatorios" className="min-w-0 space-y-6">
        {errores.clienteId ? <p role="alert">Cliente: {errores.clienteId}</p> : null}
        {errores.vehiculoId ? <p role="alert">Vehículo: {errores.vehiculoId}</p> : null}
        {errores.aseguradoraId ? <p role="alert">Aseguradora: {errores.aseguradoraId}</p> : null}
        {children}
      </section>

      <fieldset className="min-w-0 space-y-4 rounded-lg border border-current/20 p-4">
        <legend className="px-1 text-xl font-semibold">Documentación obligatoria</legend>
        <p id="ayuda-documentos" className="text-sm">
          Seleccioná una foto por categoría. Podés reemplazarla antes de registrar.
        </p>
        <p id="ayuda-archivos" className="text-sm opacity-75">
          Los archivos quedan solo en esta pantalla. Si recargás o salís, deberás
          seleccionarlos nuevamente.
        </p>
        {errores.documentos ? <p role="alert">{errores.documentos}</p> : null}

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
                if (archivo) setDocumentos((actuales) => ({ ...actuales, [tipo]: archivo }));
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
      </fieldset>

      <fieldset className="min-w-0 space-y-3 rounded-lg border border-current/20 p-4">
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
            if (archivos.length > 0) setAdicionales(archivos);
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
        <p id="guardado-no-disponible">El guardado de siniestros todavía no está disponible.</p>
        <Button type="button" disabled aria-describedby="guardado-no-disponible" className="w-full sm:w-auto">
          Registrar siniestro
        </Button>
      </div>
    </form>
  );
}
