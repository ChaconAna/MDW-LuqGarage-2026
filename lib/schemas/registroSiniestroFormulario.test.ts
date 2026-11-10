import { GradoDano, TipoDocumentoSiniestro } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { registroSiniestroFormularioSchema } from "./registroSiniestroFormulario";
import type { DatosCreacionSiniestroMultipart } from "./siniestro";

const tiposObligatorios = Object.values(TipoDocumentoSiniestro).filter(
  (tipo) => tipo !== TipoDocumentoSiniestro.ADICIONAL,
);

function datosFormulario(fechaSiniestro = "2026-11-05") {
  return {
    numeroSiniestro: "SIN-PRUEBA",
    fechaSiniestro,
    gradoDano: GradoDano.MODERADO,
    numeroPoliza: "POL-PRUEBA",
    clienteId: "11111111-1111-4111-8111-111111111111",
    vehiculoId: "22222222-2222-4222-8222-222222222222",
    aseguradoraId: "33333333-3333-4333-8333-333333333333",
    documentos: tiposObligatorios.map((tipo): DatosCreacionSiniestroMultipart["documentos"][number] => ({
      tipo,
      archivo: new File(["foto simulada"], `${tipo}.jpg`),
    })),
  };
}

describe("registroSiniestroFormularioSchema", () => {
  it.each([
    ["2026-11-05", "2026-11-05T03:00:00.000Z"],
    ["2024-02-29", "2024-02-29T03:00:00.000Z"],
    ["2008-01-15", "2008-01-15T02:00:00.000Z"],
    ["2007-12-30", "2007-12-30T03:00:00.000Z"],
  ])("convierte %s al primer instante local %s", (fecha, esperado) => {
    const resultado = registroSiniestroFormularioSchema.parse(datosFormulario(fecha));
    expect(resultado.fechaSiniestro.toISOString()).toBe(esperado);
    expect(resultado.documentos).toHaveLength(6);

    const diaLocal = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric", month: "2-digit", day: "2-digit",
    });
    expect(diaLocal.format(resultado.fechaSiniestro)).toBe(fecha);
    expect(diaLocal.format(new Date(resultado.fechaSiniestro.getTime() - 1))).not.toBe(fecha);
  });

  it.each(["2026-02-30", "2025-02-29", "2026-13-01", "05/11/2026", "", "2026-11-05T00:00:00Z"])(
    "rechaza la fecha de formulario inválida %s",
    (fecha) => {
      const resultado = registroSiniestroFormularioSchema.safeParse(datosFormulario(fecha));
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues).toContainEqual(expect.objectContaining({ path: ["fechaSiniestro"] }));
      }
    },
  );

  it("acepta varias fotografías adicionales y conserva sus archivos", () => {
    const datos = datosFormulario();
    const adicionales = [new File(["uno"], "uno.jpg"), new File(["dos"], "dos.jpg")];
    datos.documentos.push(...adicionales.map((archivo) => ({ tipo: TipoDocumentoSiniestro.ADICIONAL, archivo })));
    const resultado = registroSiniestroFormularioSchema.parse(datos);
    expect(resultado.documentos.slice(6).map(({ archivo }) => archivo)).toEqual(adicionales);
  });

  it.each(tiposObligatorios)("rechaza la categoría obligatoria ausente %s", (tipo) => {
    const datos = datosFormulario();
    datos.documentos = datos.documentos.filter((documento) => documento.tipo !== tipo);
    expect(registroSiniestroFormularioSchema.safeParse(datos).success).toBe(false);
  });

  it("rechaza una categoría obligatoria duplicada", () => {
    const datos = datosFormulario();
    datos.documentos.push({ tipo: TipoDocumentoSiniestro.DENUNCIA, archivo: new File(["otra"], "otra.jpg") });
    expect(registroSiniestroFormularioSchema.safeParse(datos).success).toBe(false);
  });

  it.each(Object.values(TipoDocumentoSiniestro))("rechaza un archivo vacío en %s", (tipo) => {
    const datos = datosFormulario();
    datos.documentos = datos.documentos.filter((documento) => documento.tipo !== tipo);
    datos.documentos.push({ tipo, archivo: new File([], "vacio.jpg") });
    const resultado = registroSiniestroFormularioSchema.safeParse(datos);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues).toContainEqual(expect.objectContaining({ path: [tipo] }));
    }
  });

  it("rechaza referencias de Storage aunque acompañen un archivo válido", () => {
    const datos = datosFormulario();
    const documentos = datos.documentos.map((documento) => ({
      ...documento, referenciaArchivo: "referencia-arbitraria",
    }));
    expect(registroSiniestroFormularioSchema.safeParse({ ...datos, documentos }).success).toBe(false);
  });
});
