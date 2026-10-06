import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({
  enviarPresupuestoPorId: vi.fn(),
  requerirRol: vi.fn(),
  serializarDetallePresupuesto: vi.fn((presupuesto: unknown) => presupuesto),
}));

vi.mock("@/lib/auth", () => ({
  requerirRol: dependencias.requerirRol,
}));

vi.mock("@/lib/db/presupuesto", () => ({
  enviarPresupuestoPorId: dependencias.enviarPresupuestoPorId,
}));

vi.mock("@/lib/http", () => ({
  responderError: (_contexto: string, error: unknown) => {
    console.error(error);
    return Response.json({ error: "Error interno" }, { status: 500 });
  },
}));

vi.mock("@/lib/schemas/presupuesto", async () =>
  import("../../../../../lib/schemas/presupuesto"),
);

vi.mock("@/lib/services/presupuesto", () => ({
  serializarDetallePresupuesto: dependencias.serializarDetallePresupuesto,
}));

import { POST } from "./route";

const presupuestoId = "10000000-0000-4000-8000-000000000001";

function crearRequest() {
  return new Request(
    `http://localhost/api/presupuestos/${presupuestoId}/enviar`,
    { method: "POST" },
  );
}

function crearContexto(id = presupuestoId) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  dependencias.requerirRol.mockResolvedValue({
    id: "usuario-id",
    rol: "RECEPCIONISTA",
  });
});

describe("POST /api/presupuestos/[id]/enviar", () => {
  it("registra el envío y permite los dos roles definidos", async () => {
    const presupuesto = { id: presupuestoId, estado: "ENVIADO" };
    dependencias.enviarPresupuestoPorId.mockResolvedValue({
      enviado: true,
      presupuesto,
    });

    const respuesta = await POST(crearRequest(), crearContexto());

    expect(respuesta.status).toBe(200);
    await expect(respuesta.json()).resolves.toEqual(presupuesto);
    expect(dependencias.requerirRol).toHaveBeenCalledWith([
      "RECEPCIONISTA",
      "ENCARGADO_DEL_TALLER",
    ]);
    expect(dependencias.enviarPresupuestoPorId).toHaveBeenCalledWith(
      presupuestoId,
    );
  });

  it("rechaza un id inválido sin consultar la base", async () => {
    const respuesta = await POST(crearRequest(), crearContexto("id-invalido"));

    expect(respuesta.status).toBe(400);
    await expect(respuesta.json()).resolves.toEqual({
      error: "El id debe ser un UUID válido.",
    });
    expect(dependencias.enviarPresupuestoPorId).not.toHaveBeenCalled();
  });

  it("responde 404 cuando el Presupuesto no existe", async () => {
    dependencias.enviarPresupuestoPorId.mockResolvedValue({
      enviado: false,
      motivo: "PRESUPUESTO_NO_ENCONTRADO",
    });

    const respuesta = await POST(crearRequest(), crearContexto());

    expect(respuesta.status).toBe(404);
    await expect(respuesta.json()).resolves.toEqual({
      error: "Presupuesto no encontrado.",
    });
  });

  it("responde 409 cuando el Presupuesto no está en BORRADOR", async () => {
    dependencias.enviarPresupuestoPorId.mockResolvedValue({
      enviado: false,
      motivo: "PRESUPUESTO_NO_ENVIABLE",
    });

    const respuesta = await POST(crearRequest(), crearContexto());

    expect(respuesta.status).toBe(409);
    await expect(respuesta.json()).resolves.toEqual({
      error: "El Presupuesto no está en estado BORRADOR.",
    });
  });

  it("traduce una excepción inesperada a 500 genérico", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    dependencias.enviarPresupuestoPorId.mockRejectedValue(
      new Error("Falla inesperada"),
    );

    const respuesta = await POST(crearRequest(), crearContexto());

    expect(respuesta.status).toBe(500);
    await expect(respuesta.json()).resolves.toEqual({ error: "Error interno" });
    consoleError.mockRestore();
  });
});
