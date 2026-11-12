import { TipoDocumentoSiniestro } from "@prisma/client";

import type { DatosCreacionSiniestroMultipart } from "../schemas/siniestro";

export const LIMITE_ENVIO_SINIESTRO_BYTES = 4 * 1024 * 1024;
export const MENSAJE_LIMITE_SINIESTRO =
  "El envío completo admite hasta 4 MiB entre datos y archivos. Elegí archivos más pequeños o quitá fotografías adicionales.";

export type CampoErrorRegistroSiniestro =
  | keyof DatosCreacionSiniestroMultipart
  | TipoDocumentoSiniestro;

export type EstadoRegistroSiniestro = {
  errores: Partial<Record<CampoErrorRegistroSiniestro, string>>;
  errorGeneral?: string;
};

type ValoresFormulario = Pick<
  DatosCreacionSiniestroMultipart,
  "numeroSiniestro" | "numeroPoliza" | "clienteId" | "vehiculoId" | "aseguradoraId"
> & {
  fechaSiniestro: string;
  gradoDano: DatosCreacionSiniestroMultipart["gradoDano"] | "";
};

export function construirMultipartRegistroSiniestro(
  valores: ValoresFormulario,
  documentos: DatosCreacionSiniestroMultipart["documentos"],
) {
  const formData = new FormData();
  for (const [campo, valor] of Object.entries(valores)) {
    formData.set(campo, valor);
  }
  for (const [indice, documento] of documentos.entries()) {
    formData.set(`documentos[${indice}][tipo]`, documento.tipo);
    formData.set(`documentos[${indice}][archivo]`, documento.archivo);
  }
  return formData;
}

export async function medirEnvioRegistroSiniestro(formData: FormData) {
  let contenido = 0;
  let partes = 0;
  const codificador = new TextEncoder();
  for (const [nombre, valor] of formData.entries()) {
    partes += 1;
    contenido += codificador.encode(nombre).byteLength;
    contenido += typeof valor === "string"
      ? codificador.encode(valor).byteLength
      : valor.size;
    if (contenido > LIMITE_ENVIO_SINIESTRO_BYTES) return contenido;
  }

  // Serialización local, sin requests. Reservamos espacio para el envoltorio
  // de React y los prefijos de sus partes; la infraestructura controla el cuerpo real.
  const multipart = await new Response(formData).blob();
  return multipart.size + 16 * 1024 + partes * 16;
}
