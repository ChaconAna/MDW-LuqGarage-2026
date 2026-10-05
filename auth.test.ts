import type { NextAuthConfig, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({
  configuracion: undefined as unknown,
  autorizarInicioSesionGoogle: vi.fn(),
  obtenerUsuarioParaSesionPorGoogleSub: vi.fn(),
  safeParsePerfilGoogle: vi.fn((perfil: unknown) => ({
    success: true as const,
    data: perfil,
  })),
}));

vi.mock("next-auth", () => ({
  default: vi.fn((configuracion: unknown) => {
    dependencias.configuracion = configuracion;

    return {
      auth: vi.fn(),
      handlers: { GET: vi.fn(), POST: vi.fn() },
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  }),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/db/usuario", () => ({
  autorizarInicioSesionGoogle: dependencias.autorizarInicioSesionGoogle,
  obtenerUsuarioParaSesionPorGoogleSub:
    dependencias.obtenerUsuarioParaSesionPorGoogleSub,
}));

vi.mock("@/lib/schemas/autenticacion", () => ({
  perfilGoogleSchema: {
    safeParse: dependencias.safeParsePerfilGoogle,
  },
}));

import "./auth";

function obtenerCallbacks() {
  const configuracion = dependencias.configuracion as NextAuthConfig;
  const jwt = configuracion.callbacks?.jwt;
  const session = configuracion.callbacks?.session;

  if (!jwt || !session) {
    throw new Error("Se esperaban los callbacks jwt y session.");
  }

  return { jwt, session };
}

const perfilGoogle = {
  sub: "google-sub-123",
  email: "persona@ejemplo.com",
  email_verified: true,
};

describe("callbacks de sesión de Auth.js", () => {
  beforeEach(() => {
    dependencias.obtenerUsuarioParaSesionPorGoogleSub.mockReset();
    dependencias.safeParsePerfilGoogle.mockImplementation((perfil: unknown) => ({
      success: true,
      data: perfil,
    }));
  });

  it("construye los claims locales desde el Usuario encontrado por googleSub", async () => {
    const { jwt } = obtenerCallbacks();
    dependencias.obtenerUsuarioParaSesionPorGoogleSub.mockResolvedValue({
      id: "10000000-0000-4000-8000-000000000001",
      rol: "MECANICO",
      activo: true,
    });

    const token = await jwt({
      token: {},
      user: {},
      account: null,
      profile: {
        ...perfilGoogle,
        usuarioId: "dato-no-confiable",
        rol: "ADMINISTRADOR",
      },
      trigger: "signIn",
    } as never);

    expect(dependencias.obtenerUsuarioParaSesionPorGoogleSub).toHaveBeenCalledWith(
      perfilGoogle.sub,
    );
    expect(token).toMatchObject({
      usuarioId: "10000000-0000-4000-8000-000000000001",
      rol: "MECANICO",
    });
  });

  it.each([
    ["no existe", null],
    [
      "está inactivo",
      {
        id: "10000000-0000-4000-8000-000000000001",
        rol: "MECANICO",
        activo: false,
      },
    ],
  ])("no genera JWT local cuando el Usuario %s", async (_caso, usuario) => {
    const { jwt } = obtenerCallbacks();
    dependencias.obtenerUsuarioParaSesionPorGoogleSub.mockResolvedValue(usuario);

    await expect(
      jwt({
        token: {},
        user: {},
        account: null,
        profile: perfilGoogle,
        trigger: "signIn",
      } as never),
    ).resolves.toBeNull();
  });

  it("no reemplaza claims establecidos con datos de session.update", async () => {
    const { jwt } = obtenerCallbacks();
    const token: JWT = {
      usuarioId: "10000000-0000-4000-8000-000000000001",
      rol: "MECANICO",
    };

    await expect(
      jwt({
        token,
        user: {},
        trigger: "update",
        session: {
          usuarioId: "dato-no-confiable",
          rol: "ADMINISTRADOR",
        },
      } as never),
    ).resolves.toEqual(token);

    expect(
      dependencias.obtenerUsuarioParaSesionPorGoogleSub,
    ).not.toHaveBeenCalled();
  });

  it("copia usuarioId y rol válidos desde JWT a session.user", async () => {
    const { session } = obtenerCallbacks();
    const sesion = {
      expires: "2026-12-31T00:00:00.000Z",
      user: {
        name: "Persona",
        email: "persona@ejemplo.com",
        image: null,
      },
    } as Session;

    const resultado = await session({
      session: sesion,
      token: {
        usuarioId: "10000000-0000-4000-8000-000000000001",
        rol: "MECANICO",
      },
    } as never);

    expect(resultado.user).toMatchObject({
      usuarioId: "10000000-0000-4000-8000-000000000001",
      rol: "MECANICO",
    });
  });

  it("invalida un JWT posterior que tiene usuarioId pero no rol", async () => {
    const { jwt } = obtenerCallbacks();

    await expect(
      jwt({
        token: { usuarioId: "10000000-0000-4000-8000-000000000001" },
        user: {},
        trigger: "update",
      } as never),
    ).resolves.toBeNull();

    expect(
      dependencias.obtenerUsuarioParaSesionPorGoogleSub,
    ).not.toHaveBeenCalled();
  });

  it("invalida un JWT posterior que tiene rol pero no usuarioId", async () => {
    const { jwt } = obtenerCallbacks();

    await expect(
      jwt({
        token: { rol: "MECANICO" },
        user: {},
        trigger: "update",
      } as never),
    ).resolves.toBeNull();

    expect(
      dependencias.obtenerUsuarioParaSesionPorGoogleSub,
    ).not.toHaveBeenCalled();
  });
});
