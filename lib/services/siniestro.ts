import { crearSiniestro } from "../db/siniestro";
import type {
  DatosCreacionSiniestro,
  DatosCreacionSiniestroMultipart,
} from "../schemas/siniestro";

import {
  eliminarDocumentosSiniestro,
  subirDocumentoSiniestro,
} from "./supabaseStorage";

type ResultadoCreacionSiniestro = Awaited<ReturnType<typeof crearSiniestro>>;

export type ResultadoRegistroSiniestro =
  | ResultadoCreacionSiniestro
  | {
      creado: false;
      motivo: "ALMACENAMIENTO_FALLIDO";
    };

export function esFechaSiniestroValida(
  fechaSiniestro: Date,
  fechaRegistro: Date,
): boolean {
  return fechaSiniestro <= fechaRegistro;
}

async function compensarDocumentosSubidos(
  documentos: readonly DatosCreacionSiniestro["documentos"][number][],
) {
  if (documentos.length === 0) {
    return;
  }

  try {
    await eliminarDocumentosSiniestro({
      rutas: documentos.map(({ referenciaArchivo }) => referenciaArchivo),
    });
  } catch {
    // La compensación no debe ocultar el fallo original de carga o persistencia.
  }
}

export async function registrarSiniestroConDocumentos(
  datos: DatosCreacionSiniestroMultipart,
  fechaRegistro: Date,
): Promise<ResultadoRegistroSiniestro> {
  const idIntento = crypto.randomUUID();
  const documentosSubidos: DatosCreacionSiniestro["documentos"] = [];

  for (const documento of datos.documentos) {
    const resultadoSubida = await subirDocumentoSiniestro({
      archivo: documento.archivo,
      ruta: `siniestros/${idIntento}/${crypto.randomUUID()}`,
    });

    if (!resultadoSubida.ok) {
      await compensarDocumentosSubidos(documentosSubidos);
      return { creado: false, motivo: "ALMACENAMIENTO_FALLIDO" };
    }

    documentosSubidos.push({
      tipo: documento.tipo,
      referenciaArchivo: resultadoSubida.referenciaArchivo,
    });
  }

  const resultadoCreacion = await crearSiniestro(
    {
      ...datos,
      documentos: documentosSubidos,
    },
    fechaRegistro,
  );

  if (!resultadoCreacion.creado) {
    await compensarDocumentosSubidos(documentosSubidos);
  }

  return resultadoCreacion;
}
