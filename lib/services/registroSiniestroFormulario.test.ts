import { GradoDano, TipoDocumentoSiniestro } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { registroSiniestroFormularioSchema } from "../schemas/registroSiniestroFormulario";
import type { DatosCreacionSiniestroMultipart } from "../schemas/siniestro";
import { convertirFormDataSiniestro } from "./siniestroMultipart";
import {
  construirMultipartRegistroSiniestro,
  LIMITE_ENVIO_SINIESTRO_BYTES,
  medirEnvioRegistroSiniestro,
} from "./registroSiniestroFormulario";

function valoresFormulario() {
  return {
    numeroSiniestro: "SIN-PRUEBA",
    fechaSiniestro: "2026-11-05",
    gradoDano: GradoDano.LEVE,
    numeroPoliza: "POL-PRUEBA",
    clienteId: "11111111-1111-4111-8111-111111111111",
    vehiculoId: "22222222-2222-4222-8222-222222222222",
    aseguradoraId: "33333333-3333-4333-8333-333333333333",
  };
}

function documentosFormulario(): DatosCreacionSiniestroMultipart["documentos"] {
  return Object.values(TipoDocumentoSiniestro)
    .filter((tipo) => tipo !== TipoDocumentoSiniestro.ADICIONAL)
    .map((tipo) => ({ tipo, archivo: new File(["foto simulada"], `${tipo}.jpg`) }));
}

describe("construirMultipartRegistroSiniestro", () => {
  it("envía los siete escalares una sola vez y los pares del contrato existente", () => {
    const valores = valoresFormulario();
    const documentos = documentosFormulario();
    const formData = construirMultipartRegistroSiniestro(valores, documentos);

    for (const [campo, valor] of Object.entries(valores)) {
      expect(formData.getAll(campo)).toEqual([valor]);
    }
    expect([...formData.entries()]).toHaveLength(7 + 6 * 2);
    expect(convertirFormDataSiniestro(formData)).toEqual({ ...valores, documentos });
    expect(registroSiniestroFormularioSchema.safeParse(convertirFormDataSiniestro(formData)).success).toBe(true);
  });

  it("incorpora varias fotografías adicionales con sus pares y orden", () => {
    const documentos = documentosFormulario();
    documentos.push(
      { tipo: TipoDocumentoSiniestro.ADICIONAL, archivo: new File(["uno"], "uno.jpg") },
      { tipo: TipoDocumentoSiniestro.ADICIONAL, archivo: new File(["dos"], "dos.jpg") },
    );
    const formData = construirMultipartRegistroSiniestro(valoresFormulario(), documentos);
    expect(formData.get("documentos[6][tipo]")).toBe(TipoDocumentoSiniestro.ADICIONAL);
    expect(formData.get("documentos[7][tipo]")).toBe(TipoDocumentoSiniestro.ADICIONAL);
    const resultado = registroSiniestroFormularioSchema.parse(convertirFormDataSiniestro(formData));
    expect(resultado.documentos.slice(6).map(({ archivo }) => archivo.name)).toEqual(["uno.jpg", "dos.jpg"]);
  });
});

describe("medirEnvioRegistroSiniestro", () => {
  it("admite un envío pequeño incluyendo datos, archivos y margen de transporte", async () => {
    const formData = construirMultipartRegistroSiniestro(valoresFormulario(), documentosFormulario());
    const tamano = await medirEnvioRegistroSiniestro(formData);
    const cuerpo = await new Response(formData).blob();
    expect(tamano).toBeGreaterThan(cuerpo.size);
    expect(tamano).toBeLessThan(LIMITE_ENVIO_SINIESTRO_BYTES);
  });

  it("admite un cuerpo con margen suficiente por debajo de 4 MiB", async () => {
    const formData = new FormData();
    formData.set("archivo", new File([new Uint8Array(LIMITE_ENVIO_SINIESTRO_BYTES - 128 * 1024)], "foto.jpg"));
    expect(await medirEnvioRegistroSiniestro(formData)).toBeLessThan(LIMITE_ENVIO_SINIESTRO_BYTES);
  });

  it("considera el framing y el margen aun cuando el archivo solo no alcanza el límite", async () => {
    const formData = new FormData();
    formData.set("archivo", new File([new Uint8Array(LIMITE_ENVIO_SINIESTRO_BYTES - 1)], "foto.jpg"));
    expect(await medirEnvioRegistroSiniestro(formData)).toBeGreaterThan(LIMITE_ENVIO_SINIESTRO_BYTES);
  });

  it("aplica el límite al total de archivos, no a cada uno individualmente", async () => {
    const formData = new FormData();
    const mitad = new Uint8Array(LIMITE_ENVIO_SINIESTRO_BYTES / 2);
    formData.set("uno", new File([mitad], "uno.jpg"));
    formData.set("dos", new File([mitad], "dos.jpg"));
    expect(await medirEnvioRegistroSiniestro(formData)).toBeGreaterThan(LIMITE_ENVIO_SINIESTRO_BYTES);
  });

  it("cuenta bytes UTF-8 de texto, sin tratar el límite como exclusivo de archivos", async () => {
    const formData = new FormData();
    formData.set("numeroSiniestro", "á".repeat(LIMITE_ENVIO_SINIESTRO_BYTES / 2));
    expect(await medirEnvioRegistroSiniestro(formData)).toBeGreaterThan(LIMITE_ENVIO_SINIESTRO_BYTES);
  });
});
