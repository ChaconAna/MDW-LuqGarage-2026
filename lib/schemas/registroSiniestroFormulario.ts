import { z } from "zod";

import { crearSiniestroMultipartSchema } from "./siniestro";

const fechaBuenosAires = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Argentina/Buenos_Aires",
  calendar: "iso8601",
  numberingSystem: "latn",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  era: "short",
});

function diaBuenosAires(instante: number) {
  const partes = fechaBuenosAires.formatToParts(new Date(instante));
  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((valor) => valor.type === tipo)?.value;
  const anio = parte("era") === "BC" ? 1 - Number(parte("year")) : Number(parte("year"));
  return anio * 10000 + Number(parte("month")) * 100 + Number(parte("day"));
}

function inicioDiaBuenosAires(fecha: string) {
  const referencia = new Date(`${fecha}T00:00:00.000Z`).getTime();
  const diaBuscado = Number(fecha.replaceAll("-", ""));
  let desde = referencia - 36 * 60 * 60 * 1000;
  let hasta = referencia + 36 * 60 * 60 * 1000;

  // Primer milisegundo del día local. También cubre saltos históricos en los
  // que las 00:00 no existieron, sin fijar arbitrariamente un offset UTC.
  while (desde < hasta) {
    const medio = Math.floor((desde + hasta) / 2);
    if (diaBuenosAires(medio) < diaBuscado) desde = medio + 1;
    else hasta = medio;
  }
  return new Date(desde).toISOString();
}

export const registroSiniestroFormularioSchema = z
  .object({
    fechaSiniestro: z
      .string()
      .date("Ingresá una fecha calendario válida.")
      .transform(inicioDiaBuenosAires),
  })
  .passthrough()
  .pipe(crearSiniestroMultipartSchema)
  .superRefine((datos, contexto) => {
    for (const documento of datos.documentos) {
      if (documento.archivo.size === 0) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: [documento.tipo],
          message: "El archivo no puede estar vacío. Elegí una fotografía con contenido.",
        });
      }
    }
  });
