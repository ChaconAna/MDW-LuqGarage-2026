import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({
  auth: vi.fn(),
  obtenerUsuarioParaAutorizacionPorId: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/auth", () => ({
  auth: dependencias.auth,
}));

vi.mock("@/lib/db/usuario", () => ({
  obtenerUsuarioParaAutorizacionPorId:
    dependencias.obtenerUsuarioParaAutorizacionPorId,
}));

vi.mock("next/navigation", () => ({
  redirect: dependencias.redirect,
}));

import * as autorizacion from "./auth";
import { autorizarPagina } from "./authPagina";

const requerirRolOriginal = autorizacion.requerirRol;
const requerirRol = vi.spyOn(autorizacion, "requerirRol");
const usuarioId = "10000000-0000-4000-8000-000000000001";
const rolesPermitidos = ["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"] as const;
const interrupcionRedireccion = new Error("NEXT_REDIRECT");

beforeEach(() => {
  dependencias.auth.mockReset();
  dependencias.obtenerUsuarioParaAutorizacionPorId.mockReset();
  dependencias.redirect.mockReset();
  dependencias.redirect.mockImplementation(() => {
    throw interrupcionRedireccion;
  });
  requerirRol.mockReset();
  requerirRol.mockImplementation(requerirRolOriginal);
});

afterAll(() => {
  requerirRol.mockRestore();
});

describe("autorizarPagina", () => {
  it.each(rolesPermitidos)(
    "devuelve el Usuario autorizado %s y delega sin verificaciones adicionales",
    async (rol) => {
      const usuario = { id: usuarioId, rol };
      requerirRol.mockResolvedValue(usuario);

      const resultado = await autorizarPagina(rolesPermitidos);

      expect(resultado).toEqual({ autorizado: true, usuario });
      if (resultado.autorizado) {
        expect(resultado.usuario).toBe(usuario);
      }
      expect(requerirRol).toHaveBeenCalledExactlyOnceWith(rolesPermitidos);
      expect(dependencias.auth).not.toHaveBeenCalled();
      expect(dependencias.obtenerUsuarioParaAutorizacionPorId).not.toHaveBeenCalled();
      expect(dependencias.redirect).not.toHaveBeenCalled();
    },
  );

  it.each(["MECANICO", "ADMINISTRADOR"] as const)(
    "devuelve acceso denegado para %s sin redirigir",
    async (rol) => {
      dependencias.auth.mockResolvedValue({ user: { usuarioId, rol } });
      dependencias.obtenerUsuarioParaAutorizacionPorId.mockResolvedValue({
        id: usuarioId,
        rol,
        activo: true,
      });

      await expect(autorizarPagina(rolesPermitidos)).resolves.toEqual({
        autorizado: false,
      });

      expect(requerirRol).toHaveBeenCalledExactlyOnceWith(rolesPermitidos);
      expect(dependencias.auth).toHaveBeenCalledTimes(1);
      expect(dependencias.obtenerUsuarioParaAutorizacionPorId)
        .toHaveBeenCalledExactlyOnceWith(usuarioId);
      expect(dependencias.redirect).not.toHaveBeenCalled();
    },
  );

  it("redirige a / sin consultar el Usuario cuando no hay sesión", async () => {
    dependencias.auth.mockResolvedValue(null);

    await expect(autorizarPagina(rolesPermitidos)).rejects.toBe(
      interrupcionRedireccion,
    );

    expect(dependencias.redirect).toHaveBeenCalledExactlyOnceWith("/");
    expect(dependencias.obtenerUsuarioParaAutorizacionPorId).not.toHaveBeenCalled();
  });

  it.each([
    { caso: "inexistente", usuario: null },
    {
      caso: "inactivo",
      usuario: { id: usuarioId, rol: "RECEPCIONISTA", activo: false },
    },
  ])("redirige a / para un Usuario $caso", async ({ usuario }) => {
    dependencias.auth.mockResolvedValue({
      user: { usuarioId, rol: "RECEPCIONISTA" },
    });
    dependencias.obtenerUsuarioParaAutorizacionPorId.mockResolvedValue(usuario);

    await expect(autorizarPagina(rolesPermitidos)).rejects.toBe(
      interrupcionRedireccion,
    );

    expect(requerirRol).toHaveBeenCalledExactlyOnceWith(rolesPermitidos);
    expect(dependencias.redirect).toHaveBeenCalledExactlyOnceWith("/");
  });

  it("conserva la autorización según el rol vigente aunque difiera del JWT", async () => {
    dependencias.auth.mockResolvedValue({
      user: { usuarioId, rol: "MECANICO" },
    });
    dependencias.obtenerUsuarioParaAutorizacionPorId.mockResolvedValue({
      id: usuarioId,
      rol: "ENCARGADO_DEL_TALLER",
      activo: true,
    });

    await expect(autorizarPagina(rolesPermitidos)).resolves.toEqual({
      autorizado: true,
      usuario: { id: usuarioId, rol: "ENCARGADO_DEL_TALLER" },
    });

    expect(dependencias.auth).toHaveBeenCalledTimes(1);
    expect(dependencias.obtenerUsuarioParaAutorizacionPorId)
      .toHaveBeenCalledExactlyOnceWith(usuarioId);
    expect(dependencias.redirect).not.toHaveBeenCalled();
  });

  it("propaga el error inesperado original sin denegar ni redirigir", async () => {
    const error = new Error("Base de datos no disponible");
    requerirRol.mockRejectedValue(error);

    await expect(autorizarPagina(rolesPermitidos)).rejects.toBe(error);

    expect(requerirRol).toHaveBeenCalledExactlyOnceWith(rolesPermitidos);
    expect(dependencias.redirect).not.toHaveBeenCalled();
  });
});
