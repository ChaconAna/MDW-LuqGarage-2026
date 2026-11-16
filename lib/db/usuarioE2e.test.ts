import { beforeEach, describe, expect, it, vi } from "vitest";

const usuarioPrisma = vi.hoisted(() => ({
  create: vi.fn(),
  deleteMany: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("./client", () => ({
  prisma: { usuario: usuarioPrisma },
}));

import { eliminarUsuarioE2e, prepararUsuarioE2e } from "./usuarioE2e";

const usuarioId = "10000000-0000-4000-8000-000000000001";
const email = "encargado.e2e@luqgarage.test";
const usuarioEsperado = {
  id: usuarioId,
  email,
  googleSub: null,
  rol: "ENCARGADO_DEL_TALLER",
  activo: true,
};

describe("Usuario sintético para autenticación E2E", () => {
  beforeEach(() => {
    usuarioPrisma.create.mockReset();
    usuarioPrisma.deleteMany.mockReset();
    usuarioPrisma.findMany.mockReset();
  });

  it("crea el Usuario activo esperado cuando no existe ningún conflicto", async () => {
    usuarioPrisma.findMany.mockResolvedValue([]);
    usuarioPrisma.create.mockResolvedValue(usuarioEsperado);

    await expect(prepararUsuarioE2e(usuarioId)).resolves.toBe(true);

    expect(usuarioPrisma.create).toHaveBeenCalledExactlyOnceWith({
      data: usuarioEsperado,
    });
    expect(usuarioPrisma.deleteMany).not.toHaveBeenCalled();
  });

  it.each([
    ["el UUID", [{ id: usuarioId, email: "otra@luqgarage.test" }]],
    ["el email", [{ id: "20000000-0000-4000-8000-000000000002", email }]],
    ["el UUID y el email", [{ id: usuarioId, email }]],
  ])("rechaza la preparación si ya existe %s", async (_caso, existentes) => {
    usuarioPrisma.findMany.mockResolvedValue(existentes);

    await expect(prepararUsuarioE2e(usuarioId)).rejects.toThrow(
      "No se pudo preparar el Usuario E2E",
    );

    expect(usuarioPrisma.create).not.toHaveBeenCalled();
    expect(usuarioPrisma.deleteMany).not.toHaveBeenCalled();
  });

  it("no intenta limpiar cuando la preparación no creó el Usuario", async () => {
    await expect(eliminarUsuarioE2e(usuarioId, false)).resolves.toBe(false);

    expect(usuarioPrisma.findMany).not.toHaveBeenCalled();
    expect(usuarioPrisma.deleteMany).not.toHaveBeenCalled();
  });

  it("elimina únicamente el Usuario creado que conserva su identidad", async () => {
    usuarioPrisma.findMany.mockResolvedValue([usuarioEsperado]);
    usuarioPrisma.deleteMany.mockResolvedValue({ count: 1 });

    await expect(eliminarUsuarioE2e(usuarioId, true)).resolves.toBe(true);

    expect(usuarioPrisma.deleteMany).toHaveBeenCalledExactlyOnceWith({
      where: usuarioEsperado,
    });
  });

  it.each([
    ["email", { ...usuarioEsperado, email: "otro@luqgarage.test" }],
    ["googleSub", { ...usuarioEsperado, googleSub: "google-ajeno" }],
    ["rol", { ...usuarioEsperado, rol: "ADMINISTRADOR" }],
    ["estado", { ...usuarioEsperado, activo: false }],
  ])("rechaza la limpieza si cambió el %s", async (_campo, usuario) => {
    usuarioPrisma.findMany.mockResolvedValue([usuario]);

    await expect(eliminarUsuarioE2e(usuarioId, true)).rejects.toThrow(
      "su identidad cambió",
    );

    expect(usuarioPrisma.deleteMany).not.toHaveBeenCalled();
  });

  it("no elimina otro Usuario si el registro creado ya no existe", async () => {
    usuarioPrisma.findMany.mockResolvedValue([]);

    await expect(eliminarUsuarioE2e(usuarioId, true)).resolves.toBe(false);

    expect(usuarioPrisma.deleteMany).not.toHaveBeenCalled();
  });

  it("detecta un cambio concurrente y no afirma una limpieza incompleta", async () => {
    usuarioPrisma.findMany.mockResolvedValue([usuarioEsperado]);
    usuarioPrisma.deleteMany.mockResolvedValue({ count: 0 });

    await expect(eliminarUsuarioE2e(usuarioId, true)).rejects.toThrow(
      "su identidad cambió",
    );
  });
});
