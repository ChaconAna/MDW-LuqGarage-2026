import { GradoDano, TipoDocumentoSiniestro } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({
  ErrorAutorizacion: class ErrorAutorizacion extends Error {},
  registrarSiniestroConDocumentos: vi.fn(),
  requerirRol: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  ErrorAutorizacion: dependencias.ErrorAutorizacion,
  requerirRol: dependencias.requerirRol,
}));

vi.mock("@/lib/db/siniestro", () => ({
  listarSiniestros: vi.fn(),
}));

vi.mock("@/lib/http", () => ({
  responderError: (_contexto: string, error: unknown) => {
    if (error instanceof dependencias.ErrorAutorizacion) {
      return Response.json(
        { error: "No podés realizar esta operación" },
        { status: 403 },
      );
    }

    console.error(error);

    return Response.json({ error: "Error interno" }, { status: 500 });
  },
}));

vi.mock("@/lib/services/siniestro", () => ({
  esFechaSiniestroValida: (fechaSiniestro: Date, fechaRegistro: Date) =>
    fechaSiniestro <= fechaRegistro,
  registrarSiniestroConDocumentos:
    dependencias.registrarSiniestroConDocumentos,
}));

vi.mock("@/lib/schemas/siniestro", async () =>
  import("../../../lib/schemas/siniestro"),
);

import { POST } from "./route";

const tiposDocumentosObligatorios = [
  TipoDocumentoSiniestro.DENUNCIA,
  TipoDocumentoSiniestro.LATERAL_DERECHA,
  TipoDocumentoSiniestro.LATERAL_IZQUIERDA,
  TipoDocumentoSiniestro.FRONTAL,
  TipoDocumentoSiniestro.TRASERA,
  TipoDocumentoSiniestro.CERTIFICADO_COBERTURA,
] as const;

function crearFormDataValido() {
  const formData = new FormData();

  formData.set("numeroSiniestro", "SIN-2026-0001");
  formData.set("fechaSiniestro", "2026-03-03T14:30:00.000Z");
  formData.set("gradoDano", GradoDano.MODERADO);
  formData.set("numeroPoliza", "POL-123456");
  formData.set("clienteId", "11111111-1111-4111-8111-111111111111");
  formData.set("vehiculoId", "22222222-2222-4222-8222-222222222222");
  formData.set("aseguradoraId", "33333333-3333-4333-8333-333333333333");

  for (const [indice, tipo] of tiposDocumentosObligatorios.entries()) {
    formData.set(`documentos[${indice}][tipo]`, tipo);
    formData.set(
      `documentos[${indice}][archivo]`,
      new File([`archivo ${tipo}`], `${tipo.toLowerCase()}.jpg`, {
        type: "image/jpeg",
      }),
    );
  }

  return formData;
}

function crearRequest(formData: FormData) {
  return new Request("http://localhost/api/siniestros", {
    method: "POST",
    body: formData,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  dependencias.requerirRol.mockResolvedValue({
    id: "usuario-id",
    rol: "RECEPCIONISTA",
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/siniestros", () => {
  it("entrega los pares multipart validados a la orquestación y responde 201", async () => {
    const siniestro = { id: "siniestro-id" };
    dependencias.registrarSiniestroConDocumentos.mockResolvedValue({
      creado: true,
      siniestro,
    });

    const respuesta = await POST(crearRequest(crearFormDataValido()));

    expect(respuesta.status).toBe(201);
    await expect(respuesta.json()).resolves.toEqual(siniestro);
    expect(dependencias.registrarSiniestroConDocumentos).toHaveBeenCalledWith(
      {
        numeroSiniestro: "SIN-2026-0001",
        fechaSiniestro: new Date("2026-03-03T14:30:00.000Z"),
        gradoDano: GradoDano.MODERADO,
        numeroPoliza: "POL-123456",
        clienteId: "11111111-1111-4111-8111-111111111111",
        vehiculoId: "22222222-2222-4222-8222-222222222222",
        aseguradoraId: "33333333-3333-4333-8333-333333333333",
        documentos: tiposDocumentosObligatorios.map((tipo) => ({
          tipo,
          archivo: expect.objectContaining({
            name: `${tipo.toLowerCase()}.jpg`,
            type: "image/jpeg",
          }),
        })),
      },
      expect.any(Date),
    );
    expect(dependencias.requerirRol).toHaveBeenCalledWith([
      "RECEPCIONISTA",
      "ENCARGADO_DEL_TALLER",
    ]);
  });

  it("rechaza una estructura documental incompleta sin invocar la orquestación", async () => {
    const formData = crearFormDataValido();
    formData.delete("documentos[0][archivo]");

    const respuesta = await POST(crearRequest(formData));

    expect(respuesta.status).toBe(400);
    await expect(respuesta.json()).resolves.toEqual({
      error: "Los datos del Siniestro son inválidos.",
    });
    expect(dependencias.registrarSiniestroConDocumentos).not.toHaveBeenCalled();
  });

  it("rechaza un campo multipart no permitido, incluida una referenciaArchivo", async () => {
    const formData = crearFormDataValido();
    formData.set(
      "documentos[0][referenciaArchivo]",
      "referencia-arbitraria.jpg",
    );

    const respuesta = await POST(crearRequest(formData));

    expect(respuesta.status).toBe(400);
    expect(dependencias.registrarSiniestroConDocumentos).not.toHaveBeenCalled();
  });

  it("rechaza una fecha futura sin invocar la orquestación", async () => {
    const formData = crearFormDataValido();
    formData.set("fechaSiniestro", "2999-03-03T14:30:00.000Z");

    const respuesta = await POST(crearRequest(formData));

    expect(respuesta.status).toBe(400);
    await expect(respuesta.json()).resolves.toEqual({
      error:
        "La fecha del Siniestro no puede ser posterior a la fecha de registro.",
    });
    expect(dependencias.registrarSiniestroConDocumentos).not.toHaveBeenCalled();
  });

  it("traduce una falla esencial de almacenamiento a 502", async () => {
    dependencias.registrarSiniestroConDocumentos.mockResolvedValue({
      creado: false,
      motivo: "ALMACENAMIENTO_FALLIDO",
    });

    const respuesta = await POST(crearRequest(crearFormDataValido()));

    expect(respuesta.status).toBe(502);
    await expect(respuesta.json()).resolves.toEqual({
      error: "No fue posible almacenar la documentación.",
    });
  });

  it("conserva el status y mensaje de un rechazo conocido de base", async () => {
    dependencias.registrarSiniestroConDocumentos.mockResolvedValue({
      creado: false,
      motivo: "NUMERO_DUPLICADO",
    });

    const respuesta = await POST(crearRequest(crearFormDataValido()));

    expect(respuesta.status).toBe(409);
    await expect(respuesta.json()).resolves.toEqual({
      error: "Ya existe un Siniestro con el número indicado.",
    });
  });

  it("traduce una excepción inesperada a 500", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    dependencias.registrarSiniestroConDocumentos.mockRejectedValue(
      new Error("Falla inesperada."),
    );

    const respuesta = await POST(crearRequest(crearFormDataValido()));

    expect(respuesta.status).toBe(500);
    await expect(respuesta.json()).resolves.toEqual({ error: "Error interno" });
    consoleError.mockRestore();
  });

  it("mantiene la autorización existente", async () => {
    dependencias.requerirRol.mockRejectedValue(
      new dependencias.ErrorAutorizacion(),
    );

    const respuesta = await POST(crearRequest(crearFormDataValido()));

    expect(respuesta.status).toBe(403);
    await expect(respuesta.json()).resolves.toEqual({
      error: "No podés realizar esta operación",
    });
    expect(dependencias.registrarSiniestroConDocumentos).not.toHaveBeenCalled();
  });
});
