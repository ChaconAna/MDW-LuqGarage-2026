const camposSiniestroMultipart = [
  "numeroSiniestro",
  "fechaSiniestro",
  "gradoDano",
  "numeroPoliza",
  "clienteId",
  "vehiculoId",
  "aseguradoraId",
] as const;

const campoDocumentoMultipartRegex =
  /^documentos\[(0|[1-9]\d*)\]\[(tipo|archivo)\]$/;

type DocumentoMultipart = {
  tipo?: string;
  archivo?: File;
};

export function convertirFormDataSiniestro(formData: FormData): unknown {
  const campos: Record<(typeof camposSiniestroMultipart)[number], string> = {
    numeroSiniestro: "",
    fechaSiniestro: "",
    gradoDano: "",
    numeroPoliza: "",
    clienteId: "",
    vehiculoId: "",
    aseguradoraId: "",
  };

  for (const nombreCampo of camposSiniestroMultipart) {
    const valores = formData.getAll(nombreCampo);

    if (valores.length !== 1 || typeof valores[0] !== "string") {
      return null;
    }

    campos[nombreCampo] = valores[0];
  }

  const documentosPorIndice = new Map<number, DocumentoMultipart>();

  for (const [nombreCampo, valor] of formData.entries()) {
    if (camposSiniestroMultipart.includes(nombreCampo as never)) {
      continue;
    }

    const coincidencia = campoDocumentoMultipartRegex.exec(nombreCampo);

    if (!coincidencia) {
      return null;
    }

    const indice = Number(coincidencia[1]);
    const propiedad = coincidencia[2];
    const documento = documentosPorIndice.get(indice) ?? {};

    if (propiedad === "tipo") {
      if (documento.tipo !== undefined || typeof valor !== "string") {
        return null;
      }

      documento.tipo = valor;
    } else {
      if (documento.archivo !== undefined || !(valor instanceof File)) {
        return null;
      }

      documento.archivo = valor;
    }

    documentosPorIndice.set(indice, documento);
  }

  const documentos = [...documentosPorIndice.entries()]
    .sort(([indiceA], [indiceB]) => indiceA - indiceB)
    .map(([, documento]) => {
      if (documento.tipo === undefined || documento.archivo === undefined) {
        return null;
      }

      return {
        tipo: documento.tipo,
        archivo: documento.archivo,
      };
    });

  if (documentos.some((documento) => documento === null)) {
    return null;
  }

  return {
    ...campos,
    documentos,
  };
}
