import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/usuario", () => ({
  obtenerUsuarioParaAutorizacionPorId: vi.fn(),
}));

vi.mock("@/lib/auth", async () => import("./auth"));

import { ErrorAutenticacion, ErrorAutorizacion } from "./auth";
import { responderError } from "./http";

const consoleError = vi
  .spyOn(console, "error")
  .mockImplementation(() => undefined);

beforeEach(() => {
  consoleError.mockClear();
});

afterAll(() => {
  consoleError.mockRestore();
});

describe("responderError", () => {
  it("traduce ErrorAutenticacion a 401 sin registrar un error interno", async () => {
    const respuesta = responderError(
      "GET /api/clientes",
      new ErrorAutenticacion(),
    );

    expect(respuesta.status).toBe(401);
    await expect(respuesta.json()).resolves.toEqual({
      error: "No autenticado",
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("traduce ErrorAutorizacion a 403 sin registrar un error interno", async () => {
    const respuesta = responderError(
      "GET /api/clientes",
      new ErrorAutorizacion(),
    );

    expect(respuesta.status).toBe(403);
    await expect(respuesta.json()).resolves.toEqual({
      error: "No podés realizar esta operación",
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("registra y traduce un error inesperado a 500", async () => {
    const error = new Error("Base de datos no disponible");
    const contexto = "GET /api/clientes";

    const respuesta = responderError(contexto, error);

    expect(respuesta.status).toBe(500);
    await expect(respuesta.json()).resolves.toEqual({
      error: "Error interno",
    });
    expect(consoleError).toHaveBeenCalledWith(
      `Error inesperado en ${contexto}`,
      error,
    );
  });
});
