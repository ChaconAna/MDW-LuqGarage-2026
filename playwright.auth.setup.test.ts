import type { FullConfig } from "@playwright/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { crearCredencialStorageE2e } from "./lib/services/storageHttpE2e";

const dependencias = vi.hoisted(() => ({
  desconectar: vi.fn(),
  detenerStorage: vi.fn(),
  eliminarFixture: vi.fn(),
  eliminarUsuario: vi.fn(),
  iniciarStorage: vi.fn(),
  limpiarRecorrido: vi.fn(),
  prepararFixture: vi.fn(),
  prepararUsuario: vi.fn(),
}));

vi.mock("./lib/services/storageHttpE2e", async (importarOriginal) => {
  const original = await importarOriginal<
    typeof import("./lib/services/storageHttpE2e")
  >();

  return {
    ...original,
    iniciarStorageHttpE2e: dependencias.iniciarStorage,
  };
});

vi.mock("./lib/db/usuarioE2e", () => ({
  eliminarUsuarioE2e: dependencias.eliminarUsuario,
  prepararUsuarioE2e: dependencias.prepararUsuario,
}));

vi.mock("./lib/db/client", () => ({
  prisma: { $disconnect: dependencias.desconectar },
}));

vi.mock("./lib/db/flujoPrincipalE2e", () => ({
  eliminarFlujoPrincipalE2e: dependencias.eliminarFixture,
  prepararFlujoPrincipalE2e: dependencias.prepararFixture,
}));

vi.mock("./lib/db/limpiezaFlujoE2e", () => ({
  limpiarRegistrosFlujoE2e: dependencias.limpiarRecorrido,
}));

const credencial = "credencial-e2e-ficticia-de-32-caracteres";
const usuarioId = "10000000-0000-4000-8000-000000000001";
const urlBase =
  "postgresql://luqgarage_test:clave-ficticia@127.0.0.1:5432/luqgarage_test";
const variablesE2e = [
  "AUTH_URL",
  "AUTENTICACION_E2E",
  "AUTENTICACION_E2E_CREDENCIAL",
  "AUTENTICACION_E2E_USUARIO_ID",
  "DATABASE_URL",
  "DIRECT_URL",
  "FLUJO_PRINCIPAL_E2E_MANIFIESTO",
  "GITHUB_ACTIONS",
  "NODE_ENV",
  "PRUEBAS_PERSISTENCIA",
] as const;
const entornoOriginal = Object.fromEntries(
  variablesE2e.map((variable) => [variable, process.env[variable]]),
);

function configurarEntornoValido() {
  process.env.AUTH_URL = "http://127.0.0.1:3000";
  process.env.AUTENTICACION_E2E = "1";
  process.env.AUTENTICACION_E2E_CREDENCIAL = credencial;
  process.env.AUTENTICACION_E2E_USUARIO_ID = usuarioId;
  process.env.DATABASE_URL = urlBase;
  process.env.DIRECT_URL = urlBase;
  process.env.GITHUB_ACTIONS = "true";
  Reflect.set(process.env, "NODE_ENV", "production");
  process.env.PRUEBAS_PERSISTENCIA = "1";
}

function restaurarEntorno() {
  for (const variable of variablesE2e) {
    const valor = entornoOriginal[variable];
    if (valor === undefined) Reflect.deleteProperty(process.env, variable);
    else Reflect.set(process.env, variable, valor);
  }
}

async function cargarGlobalSetup() {
  const modulo = await import("./tests/e2e-auth/globalSetup");
  return modulo.default;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  configurarEntornoValido();
  dependencias.iniciarStorage.mockResolvedValue({
    bucket: "documentos-siniestros-e2e",
    credencial: "credencial-storage-sintetica",
    detener: dependencias.detenerStorage,
    puerto: 54321,
    url: "http://127.0.0.1:54321",
  });
  dependencias.prepararUsuario.mockResolvedValue(true);
  dependencias.prepararFixture.mockResolvedValue({ ejecucionId: usuarioId });
});

afterEach(() => {
  restaurarEntorno();
  vi.restoreAllMocks();
});

describe("integración del Storage con Playwright", () => {
  it("configura Next con el Storage E2E sintético", async () => {
    const configuracion = (await import("./playwright.auth.config")).default;
    const webServer = Array.isArray(configuracion.webServer)
      ? configuracion.webServer[0]
      : configuracion.webServer;

    expect(webServer?.env).toMatchObject({
      SUPABASE_SECRET_KEY: crearCredencialStorageE2e(credencial),
      SUPABASE_STORAGE_BUCKET: "documentos-siniestros-e2e",
      SUPABASE_URL: "http://127.0.0.1:54321",
    });
    expect(webServer?.env?.SUPABASE_SECRET_KEY).not.toBe(credencial);
  });

  it("inicia Storage antes de preparar el Usuario y limpia todo al finalizar", async () => {
    const globalSetup = await cargarGlobalSetup();
    const teardown = await globalSetup({} as FullConfig);

    expect(dependencias.iniciarStorage).toHaveBeenCalledExactlyOnceWith({
      puerto: 54321,
    });
    expect(dependencias.iniciarStorage.mock.invocationCallOrder[0]).toBeLessThan(
      dependencias.prepararUsuario.mock.invocationCallOrder[0]!,
    );

    await teardown?.();

    expect(dependencias.limpiarRecorrido).toHaveBeenCalledOnce();
    expect(dependencias.eliminarFixture).toHaveBeenCalledOnce();
    expect(dependencias.eliminarUsuario).toHaveBeenCalledExactlyOnceWith(
      usuarioId,
      true,
    );
    expect(dependencias.desconectar).toHaveBeenCalledOnce();
    expect(dependencias.detenerStorage).toHaveBeenCalledOnce();
  });

  it("detiene Storage y desconecta Prisma si falla la preparación del Usuario", async () => {
    dependencias.prepararUsuario.mockRejectedValue(
      new Error("Fallo de preparación simulado."),
    );
    const globalSetup = await cargarGlobalSetup();

    await expect(globalSetup({} as FullConfig)).rejects.toThrow(
      "Fallo de preparación simulado",
    );

    expect(dependencias.eliminarUsuario).toHaveBeenCalledExactlyOnceWith(
      usuarioId,
      false,
    );
    expect(dependencias.desconectar).toHaveBeenCalledOnce();
    expect(dependencias.detenerStorage).toHaveBeenCalledOnce();
  });

  it("intenta todas las limpiezas aunque una de ellas falle", async () => {
    dependencias.limpiarRecorrido.mockRejectedValue(
      new Error("Fallo de limpieza simulado."),
    );
    const globalSetup = await cargarGlobalSetup();
    const teardown = await globalSetup({} as FullConfig);

    await expect(teardown?.()).rejects.toThrow("Fallo de limpieza simulado");

    expect(dependencias.eliminarFixture).toHaveBeenCalledOnce();
    expect(dependencias.eliminarUsuario).toHaveBeenCalledOnce();
    expect(dependencias.desconectar).toHaveBeenCalledOnce();
    expect(dependencias.detenerStorage).toHaveBeenCalledOnce();
  });

  it("reintenta el cierre de Storage sin ocultar el primer fallo", async () => {
    dependencias.detenerStorage
      .mockRejectedValueOnce(new Error("Fallo de cierre simulado."))
      .mockResolvedValueOnce(undefined);
    const globalSetup = await cargarGlobalSetup();
    const teardown = await globalSetup({} as FullConfig);

    await expect(teardown?.()).rejects.toThrow("Fallo de cierre simulado");

    expect(dependencias.eliminarUsuario).toHaveBeenCalledOnce();
    expect(dependencias.desconectar).toHaveBeenCalledOnce();
    expect(dependencias.detenerStorage).toHaveBeenCalledTimes(2);
  });
});
