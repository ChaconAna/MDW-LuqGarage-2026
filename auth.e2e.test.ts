import type { NextAuthConfig, Session } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({
  configuracion: undefined as unknown,
  configuracionCredentials: undefined as unknown,
  autorizarInicioSesionGoogle: vi.fn(),
  obtenerUsuarioParaAutorizacionPorId: vi.fn(),
  obtenerUsuarioParaSesionPorGoogleSub: vi.fn(),
  crearProveedorCredentials: vi.fn((configuracion: unknown) => {
    dependencias.configuracionCredentials = configuracion;
    return { id: "e2e", type: "credentials", configuracion };
  }),
  crearNextAuth: vi.fn((configuracion: unknown) => {
    dependencias.configuracion = configuracion;
    return {
      auth: vi.fn(),
      handlers: { GET: vi.fn(), POST: vi.fn() },
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  }),
}));

vi.mock("next-auth", () => ({
  default: dependencias.crearNextAuth,
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: dependencias.crearProveedorCredentials,
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/db/usuario", () => ({
  autorizarInicioSesionGoogle: dependencias.autorizarInicioSesionGoogle,
  obtenerUsuarioParaAutorizacionPorId:
    dependencias.obtenerUsuarioParaAutorizacionPorId,
  obtenerUsuarioParaSesionPorGoogleSub:
    dependencias.obtenerUsuarioParaSesionPorGoogleSub,
}));

vi.mock("@/lib/schemas/autenticacion", async () =>
  import("./lib/schemas/autenticacion"),
);

vi.mock("@/lib/schemas/entornoE2e", async () =>
  import("./lib/schemas/entornoE2e"),
);

const usuarioId = "10000000-0000-4000-8000-000000000001";
const credencial = "credencial-e2e-ficticia-de-32-caracteres";
const urlBase =
  "postgresql://luqgarage_test:clave-ficticia@127.0.0.1:5432/luqgarage_test";
const variablesE2e = [
  "AUTENTICACION_E2E",
  "AUTENTICACION_E2E_CREDENCIAL",
  "AUTENTICACION_E2E_USUARIO_ID",
  "GITHUB_ACTIONS",
  "NODE_ENV",
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_URL",
] as const;
const entornoOriginal = Object.fromEntries(
  variablesE2e.map((variable) => [variable, process.env[variable]]),
);

type ConfiguracionCredentialsCapturada = {
  authorize: (
    credenciales: Partial<Record<"credencial", unknown>>,
    request: Request,
  ) => Promise<unknown>;
};

function configurarEntornoValido() {
  process.env.AUTENTICACION_E2E = "1";
  process.env.AUTENTICACION_E2E_CREDENCIAL = credencial;
  process.env.AUTENTICACION_E2E_USUARIO_ID = usuarioId;
  process.env.GITHUB_ACTIONS = "true";
  Reflect.set(process.env, "NODE_ENV", "production");
  process.env.DATABASE_URL = urlBase;
  process.env.DIRECT_URL = urlBase;
  process.env.AUTH_URL = "http://127.0.0.1:3000";
}

function restaurarEntorno() {
  for (const variable of variablesE2e) {
    const valor = entornoOriginal[variable];
    if (valor === undefined) Reflect.deleteProperty(process.env, variable);
    else Reflect.set(process.env, variable, valor);
  }
}

async function cargarAuth() {
  await import("./auth");
  return dependencias.configuracion as NextAuthConfig;
}

function obtenerAuthorize() {
  return (dependencias.configuracionCredentials as ConfiguracionCredentialsCapturada)
    .authorize;
}

function obtenerCallbacks() {
  const configuracion = dependencias.configuracion as NextAuthConfig;
  const signIn = configuracion.callbacks?.signIn;
  const jwt = configuracion.callbacks?.jwt;
  const session = configuracion.callbacks?.session;

  if (!signIn || !jwt || !session) {
    throw new Error("Se esperaban los callbacks signIn, jwt y session.");
  }

  return { signIn, jwt, session };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  dependencias.configuracion = undefined;
  dependencias.configuracionCredentials = undefined;
  configurarEntornoValido();
});

afterEach(() => {
  restaurarEntorno();
  vi.restoreAllMocks();
});

describe("proveedor Credentials exclusivo para E2E", () => {
  it("permanece ausente sin habilitación explícita", async () => {
    delete process.env.AUTENTICACION_E2E;

    const configuracion = await cargarAuth();

    expect(configuracion.providers).toHaveLength(1);
    expect(dependencias.crearProveedorCredentials).not.toHaveBeenCalled();
  });

  it("detiene la configuración inválida antes de crear Auth.js", async () => {
    process.env.DATABASE_URL = urlBase.replace(
      "127.0.0.1",
      "base.example.com",
    );
    process.env.DIRECT_URL = process.env.DATABASE_URL;

    await expect(import("./auth")).rejects.toThrow(/Configuración/);
    expect(dependencias.crearProveedorCredentials).not.toHaveBeenCalled();
    expect(dependencias.crearNextAuth).not.toHaveBeenCalled();
  });

  it("rechaza una credencial incorrecta sin consultar el Usuario", async () => {
    await cargarAuth();

    await expect(
      obtenerAuthorize()(
        { credencial: "credencial-e2e-incorrecta-de-32-caracteres" },
        new Request("http://127.0.0.1:3000/api/auth/callback/e2e"),
      ),
    ).resolves.toBeNull();

    expect(
      dependencias.obtenerUsuarioParaAutorizacionPorId,
    ).not.toHaveBeenCalled();
  });

  it.each([
    ["inexistente", null],
    [
      "inactivo",
      { id: usuarioId, rol: "ENCARGADO_DEL_TALLER", activo: false },
    ],
  ])("rechaza el Usuario E2E %s", async (_caso, usuario) => {
    dependencias.obtenerUsuarioParaAutorizacionPorId.mockResolvedValue(usuario);
    await cargarAuth();

    await expect(
      obtenerAuthorize()(
        { credencial },
        new Request("http://127.0.0.1:3000/api/auth/callback/e2e"),
      ),
    ).resolves.toBeNull();

    expect(
      dependencias.obtenerUsuarioParaAutorizacionPorId,
    ).toHaveBeenCalledExactlyOnceWith(usuarioId);
  });

  it("emite los claims y la sesión desde el Usuario E2E activo", async () => {
    const usuario = {
      id: usuarioId,
      rol: "ENCARGADO_DEL_TALLER" as const,
      activo: true,
    };
    dependencias.obtenerUsuarioParaAutorizacionPorId.mockResolvedValue(usuario);
    await cargarAuth();

    const usuarioAuth = await obtenerAuthorize()(
      { credencial },
      new Request("http://127.0.0.1:3000/api/auth/callback/e2e"),
    );
    expect(usuarioAuth).toEqual({ id: usuarioId });

    const { jwt, session, signIn } = obtenerCallbacks();
    await expect(
      signIn({
        account: { provider: "e2e" },
        user: usuarioAuth,
      } as never),
    ).resolves.toBe(true);

    const token = await jwt({
      account: { provider: "e2e" },
      token: {},
      trigger: "signIn",
      user: usuarioAuth,
    } as never);
    expect(token).toMatchObject({
      usuarioId,
      rol: "ENCARGADO_DEL_TALLER",
    });

    const sesion = await session({
      session: {
        expires: "2026-12-31T00:00:00.000Z",
        user: { name: "E2E", email: null, image: null },
      } as Session,
      token,
    } as never);
    expect(sesion.user).toMatchObject({
      usuarioId,
      rol: "ENCARGADO_DEL_TALLER",
    });
    expect(
      dependencias.obtenerUsuarioParaAutorizacionPorId,
    ).toHaveBeenCalledTimes(2);
  });

  it("no expone la credencial incorrecta en errores o logs", async () => {
    const secreto = "credencial-e2e-secreta-que-no-debe-publicarse";
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const advertencia = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const registro = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await cargarAuth();

    await expect(
      obtenerAuthorize()(
        { credencial: secreto },
        new Request("http://127.0.0.1:3000/api/auth/callback/e2e"),
      ),
    ).resolves.toBeNull();

    expect(JSON.stringify(error.mock.calls)).not.toContain(secreto);
    expect(JSON.stringify(advertencia.mock.calls)).not.toContain(secreto);
    expect(JSON.stringify(registro.mock.calls)).not.toContain(secreto);
  });
});
