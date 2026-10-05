import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const usuarioPrisma = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("./client", () => ({
  prisma: {
    usuario: usuarioPrisma,
  },
}));

import {
  autorizarInicioSesionGoogle,
  obtenerUsuarioParaAutorizacionPorId,
  obtenerUsuarioParaSesionPorGoogleSub,
} from "./usuario";

const datosGoogle = {
  googleSub: "google-sub-123",
  email: "persona@ejemplo.com",
};

function crearUsuario({
  activo = true,
  googleSub = null,
  rol = "ENCARGADO_DEL_TALLER",
}: {
  activo?: boolean;
  googleSub?: string | null;
  rol?:
    | "RECEPCIONISTA"
    | "ENCARGADO_DEL_TALLER"
    | "MECANICO"
    | "ADMINISTRADOR";
} = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    activo,
    googleSub,
    rol,
  };
}

describe("autorizarInicioSesionGoogle", () => {
  beforeEach(() => {
    usuarioPrisma.create.mockReset();
    usuarioPrisma.findUnique.mockReset();
    usuarioPrisma.updateMany.mockReset();
  });

  it("permite un Usuario activo ya vinculado por googleSub", async () => {
    usuarioPrisma.findUnique.mockResolvedValue(crearUsuario());

    await expect(autorizarInicioSesionGoogle(datosGoogle)).resolves.toBe(true);

    expect(usuarioPrisma.findUnique).toHaveBeenCalledTimes(1);
    expect(usuarioPrisma.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { googleSub: datosGoogle.googleSub } }),
    );
    expect(usuarioPrisma.create).not.toHaveBeenCalled();
    expect(usuarioPrisma.updateMany).not.toHaveBeenCalled();
  });

  it("rechaza un Usuario inactivo ya vinculado por googleSub", async () => {
    usuarioPrisma.findUnique.mockResolvedValue(crearUsuario({ activo: false }));

    await expect(autorizarInicioSesionGoogle(datosGoogle)).resolves.toBe(false);

    expect(usuarioPrisma.findUnique).toHaveBeenCalledTimes(1);
    expect(usuarioPrisma.create).not.toHaveBeenCalled();
    expect(usuarioPrisma.updateMany).not.toHaveBeenCalled();
  });

  it("crea un Usuario MECANICO activo para un email desconocido", async () => {
    const datosGoogleConEmailMayusculas = {
      ...datosGoogle,
      email: "Persona@Ejemplo.Com",
    };
    usuarioPrisma.findUnique.mockResolvedValue(null);
    usuarioPrisma.create.mockResolvedValue(crearUsuario({ rol: "MECANICO" }));

    await expect(
      autorizarInicioSesionGoogle(datosGoogleConEmailMayusculas),
    ).resolves.toBe(true);

    expect(usuarioPrisma.findUnique).toHaveBeenCalledTimes(2);
    expect(usuarioPrisma.findUnique).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { email: "persona@ejemplo.com" } }),
    );
    expect(usuarioPrisma.create).toHaveBeenCalledTimes(1);
    expect(usuarioPrisma.create).toHaveBeenCalledWith({
      data: {
        email: "persona@ejemplo.com",
        googleSub: datosGoogle.googleSub,
        rol: "MECANICO",
        activo: true,
      },
    });
    expect(usuarioPrisma.updateMany).not.toHaveBeenCalled();
  });

  it("rechaza un Usuario preautorizado inactivo", async () => {
    usuarioPrisma.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(crearUsuario({ activo: false }));

    await expect(autorizarInicioSesionGoogle(datosGoogle)).resolves.toBe(false);

    expect(usuarioPrisma.create).not.toHaveBeenCalled();
    expect(usuarioPrisma.updateMany).not.toHaveBeenCalled();
  });

  it("rechaza un Usuario preautorizado vinculado a otro googleSub", async () => {
    usuarioPrisma.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(crearUsuario({ googleSub: "otro-google-sub" }));

    await expect(autorizarInicioSesionGoogle(datosGoogle)).resolves.toBe(false);

    expect(usuarioPrisma.create).not.toHaveBeenCalled();
    expect(usuarioPrisma.updateMany).not.toHaveBeenCalled();
  });

  it("vincula de forma condicional el googleSub en el primer login válido", async () => {
    const usuario = crearUsuario();
    usuarioPrisma.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(usuario);
    usuarioPrisma.updateMany.mockResolvedValue({ count: 1 });

    await expect(autorizarInicioSesionGoogle(datosGoogle)).resolves.toBe(true);

    expect(usuarioPrisma.updateMany).toHaveBeenCalledWith({
      where: {
        id: usuario.id,
        googleSub: null,
        activo: true,
      },
      data: { googleSub: datosGoogle.googleSub },
    });
    expect(usuarioPrisma.create).not.toHaveBeenCalled();
    expect(usuario.rol).toBe("ENCARGADO_DEL_TALLER");
  });

  it("rechaza la vinculación si la actualización condicional no afecta filas", async () => {
    usuarioPrisma.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(crearUsuario());
    usuarioPrisma.updateMany.mockResolvedValue({ count: 0 });

    await expect(autorizarInicioSesionGoogle(datosGoogle)).resolves.toBe(false);
  });

  it("rechaza la vinculación ante un conflicto único de googleSub", async () => {
    usuarioPrisma.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(crearUsuario());
    usuarioPrisma.updateMany.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Conflicto", {
        code: "P2002",
        clientVersion: "6.19.3",
      }),
    );

    await expect(autorizarInicioSesionGoogle(datosGoogle)).resolves.toBe(false);
  });

  it("propaga errores de persistencia que no son conflictos de unicidad", async () => {
    const error = new Error("Base de datos no disponible");
    usuarioPrisma.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(crearUsuario());
    usuarioPrisma.updateMany.mockRejectedValue(error);

    await expect(autorizarInicioSesionGoogle(datosGoogle)).rejects.toThrow(
      error,
    );
  });

  it("obtiene los datos locales necesarios para la sesión por googleSub", async () => {
    const usuario = {
      id: "10000000-0000-4000-8000-000000000001",
      rol: "MECANICO",
      activo: true,
    };
    usuarioPrisma.findUnique.mockResolvedValue(usuario);

    await expect(
      obtenerUsuarioParaSesionPorGoogleSub(datosGoogle.googleSub),
    ).resolves.toEqual(usuario);

    expect(usuarioPrisma.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { googleSub: datosGoogle.googleSub } }),
    );
  });

  it("devuelve null cuando no existe un Usuario para el googleSub", async () => {
    usuarioPrisma.findUnique.mockResolvedValue(null);

    await expect(
      obtenerUsuarioParaSesionPorGoogleSub(datosGoogle.googleSub),
    ).resolves.toBeNull();
  });

  it("devuelve el estado inactivo para que la sesión pueda rechazarlo", async () => {
    usuarioPrisma.findUnique.mockResolvedValue({
      id: "10000000-0000-4000-8000-000000000001",
      rol: "MECANICO",
      activo: false,
    });

    await expect(
      obtenerUsuarioParaSesionPorGoogleSub(datosGoogle.googleSub),
    ).resolves.toMatchObject({ activo: false });
  });

  it("obtiene los datos locales necesarios para autorizar por id", async () => {
    const usuario = {
      id: "10000000-0000-4000-8000-000000000001",
      rol: "MECANICO",
      activo: true,
    };
    usuarioPrisma.findUnique.mockResolvedValue(usuario);

    await expect(
      obtenerUsuarioParaAutorizacionPorId(usuario.id),
    ).resolves.toEqual(usuario);

    expect(usuarioPrisma.findUnique).toHaveBeenCalledWith({
      where: { id: usuario.id },
      select: {
        id: true,
        rol: true,
        activo: true,
      },
    });
  });
});
