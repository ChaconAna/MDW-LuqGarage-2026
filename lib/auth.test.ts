import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({
  auth: vi.fn(),
  obtenerUsuarioParaAutorizacionPorId: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: dependencias.auth,
}));

vi.mock("@/lib/db/usuario", () => ({
  obtenerUsuarioParaAutorizacionPorId:
    dependencias.obtenerUsuarioParaAutorizacionPorId,
}));

import {
  ErrorAutenticacion,
  ErrorAutorizacion,
  requerirRol,
  requerirUsuario,
} from "./auth";

const usuarioId = "10000000-0000-4000-8000-000000000001";

function sesionConUsuario({
  id = usuarioId,
  rol = "MECANICO",
}: {
  id?: string;
  rol?: string;
} = {}) {
  return {
    user: {
      usuarioId: id,
      rol,
    },
  };
}

function usuarioLocal({
  id = usuarioId,
  rol = "MECANICO",
  activo = true,
}: {
  id?: string;
  rol?:
    | "RECEPCIONISTA"
    | "ENCARGADO_DEL_TALLER"
    | "MECANICO"
    | "ADMINISTRADOR";
  activo?: boolean;
} = {}) {
  return { id, rol, activo };
}

describe("requerirUsuario", () => {
  beforeEach(() => {
    dependencias.auth.mockReset();
    dependencias.obtenerUsuarioParaAutorizacionPorId.mockReset();
  });

  it("rechaza cuando no hay sesión", async () => {
    dependencias.auth.mockResolvedValue(null);

    await expect(requerirUsuario()).rejects.toBeInstanceOf(ErrorAutenticacion);

    expect(dependencias.obtenerUsuarioParaAutorizacionPorId).not.toHaveBeenCalled();
  });

  it("rechaza una sesión sin usuarioId local", async () => {
    dependencias.auth.mockResolvedValue({ user: { rol: "MECANICO" } });

    await expect(requerirUsuario()).rejects.toBeInstanceOf(ErrorAutenticacion);

    expect(dependencias.obtenerUsuarioParaAutorizacionPorId).not.toHaveBeenCalled();
  });

  it("rechaza cuando el Usuario local ya no existe", async () => {
    dependencias.auth.mockResolvedValue(sesionConUsuario());
    dependencias.obtenerUsuarioParaAutorizacionPorId.mockResolvedValue(null);

    await expect(requerirUsuario()).rejects.toBeInstanceOf(ErrorAutenticacion);
  });

  it("rechaza cuando el Usuario local está inactivo", async () => {
    dependencias.auth.mockResolvedValue(sesionConUsuario());
    dependencias.obtenerUsuarioParaAutorizacionPorId.mockResolvedValue(
      usuarioLocal({ activo: false }),
    );

    await expect(requerirUsuario()).rejects.toBeInstanceOf(ErrorAutenticacion);
  });

  it("devuelve el id y rol vigentes de un Usuario activo", async () => {
    dependencias.auth.mockResolvedValue(
      sesionConUsuario({ rol: "RECEPCIONISTA" }),
    );
    dependencias.obtenerUsuarioParaAutorizacionPorId.mockResolvedValue(
      usuarioLocal({ rol: "ENCARGADO_DEL_TALLER" }),
    );

    await expect(requerirUsuario()).resolves.toEqual({
      id: usuarioId,
      rol: "ENCARGADO_DEL_TALLER",
    });
  });

  it("propaga errores inesperados al consultar el Usuario local", async () => {
    const error = new Error("Base de datos no disponible");
    dependencias.auth.mockResolvedValue(sesionConUsuario());
    dependencias.obtenerUsuarioParaAutorizacionPorId.mockRejectedValue(error);

    await expect(requerirUsuario()).rejects.toThrow(error);
  });
});

describe("requerirRol", () => {
  beforeEach(() => {
    dependencias.auth.mockReset();
    dependencias.obtenerUsuarioParaAutorizacionPorId.mockReset();
  });

  it("permite el acceso cuando el rol local está incluido", async () => {
    dependencias.auth.mockResolvedValue(sesionConUsuario());
    dependencias.obtenerUsuarioParaAutorizacionPorId.mockResolvedValue(
      usuarioLocal({ rol: "ENCARGADO_DEL_TALLER" }),
    );

    await expect(
      requerirRol(["ENCARGADO_DEL_TALLER"]),
    ).resolves.toEqual({
      id: usuarioId,
      rol: "ENCARGADO_DEL_TALLER",
    });
  });

  it("rechaza el acceso cuando el rol local no está permitido", async () => {
    dependencias.auth.mockResolvedValue(sesionConUsuario());
    dependencias.obtenerUsuarioParaAutorizacionPorId.mockResolvedValue(
      usuarioLocal({ rol: "MECANICO" }),
    );

    await expect(
      requerirRol(["RECEPCIONISTA"]),
    ).rejects.toBeInstanceOf(ErrorAutorizacion);
  });

  it("usa el rol vigente de la base aunque difiera del JWT", async () => {
    dependencias.auth.mockResolvedValue(sesionConUsuario({ rol: "MECANICO" }));
    dependencias.obtenerUsuarioParaAutorizacionPorId.mockResolvedValue(
      usuarioLocal({ rol: "ENCARGADO_DEL_TALLER" }),
    );

    await expect(
      requerirRol(["ENCARGADO_DEL_TALLER"]),
    ).resolves.toMatchObject({ rol: "ENCARGADO_DEL_TALLER" });
  });

  it("no concede permisos por un rol privilegiado que solo está en el JWT", async () => {
    dependencias.auth.mockResolvedValue(
      sesionConUsuario({ rol: "ADMINISTRADOR" }),
    );
    dependencias.obtenerUsuarioParaAutorizacionPorId.mockResolvedValue(
      usuarioLocal({ rol: "MECANICO" }),
    );

    await expect(
      requerirRol(["ADMINISTRADOR"]),
    ).rejects.toBeInstanceOf(ErrorAutorizacion);
  });
});
