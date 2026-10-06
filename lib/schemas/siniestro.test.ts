import { GradoDano, TipoDocumentoSiniestro } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { crearSiniestroMultipartSchema } from "./siniestro";

const tiposDocumentosObligatorios = [
  TipoDocumentoSiniestro.DENUNCIA,
  TipoDocumentoSiniestro.LATERAL_DERECHA,
  TipoDocumentoSiniestro.LATERAL_IZQUIERDA,
  TipoDocumentoSiniestro.FRONTAL,
  TipoDocumentoSiniestro.TRASERA,
  TipoDocumentoSiniestro.CERTIFICADO_COBERTURA,
] as const;

function crearArchivo(tipo: TipoDocumentoSiniestro) {
  return new File(["documento de prueba"], `${tipo.toLowerCase()}.jpg`, {
    type: "image/jpeg",
  });
}

function crearDatosMultipart() {
  return {
    numeroSiniestro: "SIN-2026-0001",
    fechaSiniestro: "2026-03-03T14:30:00.000Z",
    gradoDano: GradoDano.MODERADO,
    numeroPoliza: "POL-123456",
    clienteId: "11111111-1111-4111-8111-111111111111",
    vehiculoId: "22222222-2222-4222-8222-222222222222",
    aseguradoraId: "33333333-3333-4333-8333-333333333333",
    documentos: tiposDocumentosObligatorios.map((tipo) => ({
      tipo,
      archivo: crearArchivo(tipo),
    })),
  };
}

describe("crearSiniestroMultipartSchema", () => {
  it("acepta los datos del Siniestro con los seis archivos obligatorios", () => {
    const resultado = crearSiniestroMultipartSchema.safeParse(
      crearDatosMultipart(),
    );

    expect(resultado.success).toBe(true);

    if (resultado.success) {
      expect(resultado.data.fechaSiniestro).toEqual(
        new Date("2026-03-03T14:30:00.000Z"),
      );
      expect(resultado.data.documentos).toHaveLength(6);
      expect(resultado.data.documentos[0]?.archivo).toBeInstanceOf(File);
    }
  });

  it("rechaza cuando falta un tipo documental obligatorio", () => {
    const datos = crearDatosMultipart();
    datos.documentos = datos.documentos.filter(
      ({ tipo }) => tipo !== TipoDocumentoSiniestro.TRASERA,
    );

    expect(crearSiniestroMultipartSchema.safeParse(datos).success).toBe(false);
  });

  it("rechaza cuando se duplica un tipo documental obligatorio", () => {
    const datos = crearDatosMultipart();
    datos.documentos.push({
      tipo: TipoDocumentoSiniestro.DENUNCIA,
      archivo: crearArchivo(TipoDocumentoSiniestro.DENUNCIA),
    });

    expect(crearSiniestroMultipartSchema.safeParse(datos).success).toBe(false);
  });

  it("rechaza un documento que no contiene un archivo real", () => {
    const datos = crearDatosMultipart();
    const primerDocumento = datos.documentos[0];

    if (!primerDocumento) {
      throw new Error("Los documentos obligatorios deben existir.");
    }

    expect(
      crearSiniestroMultipartSchema.safeParse({
        ...datos,
        documentos: [
          { ...primerDocumento, archivo: "no es un archivo" },
          ...datos.documentos.slice(1),
        ],
      }).success,
    ).toBe(false);
  });

  it("rechaza referencias de archivo enviadas en el contrato multipart", () => {
    const datos = crearDatosMultipart();
    const primerDocumento = datos.documentos[0];

    if (!primerDocumento) {
      throw new Error("Los documentos obligatorios deben existir.");
    }

    expect(
      crearSiniestroMultipartSchema.safeParse({
        ...datos,
        documentos: [
          {
            ...primerDocumento,
            referenciaArchivo: "referencia-arbitraria.jpg",
          },
          ...datos.documentos.slice(1),
        ],
      }).success,
    ).toBe(false);
  });
});
