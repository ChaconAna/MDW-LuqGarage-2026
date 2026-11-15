import { describe, expect, it } from "vitest";

import { validarEntornoAutenticacionE2e } from "./entornoE2e";

const urlBase =
  "postgresql://luqgarage_test:clave-ficticia@127.0.0.1:5432/luqgarage_test";
const credencial = "credencial-e2e-ficticia-de-32-caracteres";
const usuarioId = "10000000-0000-4000-8000-000000000001";

function entornoValido() {
  return {
    AUTENTICACION_E2E: "1",
    GITHUB_ACTIONS: "true",
    NODE_ENV: "production",
    DATABASE_URL: urlBase,
    DIRECT_URL: urlBase,
    AUTH_URL: "http://127.0.0.1:3000",
    AUTENTICACION_E2E_CREDENCIAL: credencial,
    AUTENTICACION_E2E_USUARIO_ID: usuarioId,
  };
}

describe("validarEntornoAutenticacionE2e", () => {
  it("habilita la autenticación E2E con toda la configuración autorizada", () => {
    expect(validarEntornoAutenticacionE2e(entornoValido())).toBe(true);
  });

  it.each([undefined, "", "0", "true", "01"])(
    "permanece deshabilitada por defecto con el indicador %s",
    (indicador) => {
      expect(
        validarEntornoAutenticacionE2e({
          ...entornoValido(),
          AUTENTICACION_E2E: indicador,
        }),
      ).toBe(false);
    },
  );

  it("rechaza una base remota", () => {
    const conexion = urlBase.replace("127.0.0.1", "base.example.com");

    expect(() =>
      validarEntornoAutenticacionE2e({
        ...entornoValido(),
        DATABASE_URL: conexion,
        DIRECT_URL: conexion,
      }),
    ).toThrow(/Configuración/);
  });

  it("rechaza una base local que no sea la exclusiva de pruebas", () => {
    const conexion = urlBase.replace("/luqgarage_test", "/luqgarage");

    expect(() =>
      validarEntornoAutenticacionE2e({
        ...entornoValido(),
        DATABASE_URL: conexion,
        DIRECT_URL: conexion,
      }),
    ).toThrow(/Configuración/);
  });

  it.each([
    "https://luqgarage.example.com",
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3000/callback",
  ])("rechaza el host de autenticación no autorizado %s", (authUrl) => {
    expect(() =>
      validarEntornoAutenticacionE2e({
        ...entornoValido(),
        AUTH_URL: authUrl,
      }),
    ).toThrow(/Configuración/);
  });

  it.each([
    "GITHUB_ACTIONS",
    "NODE_ENV",
    "DATABASE_URL",
    "DIRECT_URL",
    "AUTH_URL",
    "AUTENTICACION_E2E_CREDENCIAL",
    "AUTENTICACION_E2E_USUARIO_ID",
  ])("rechaza la configuración incompleta sin %s", (campo) => {
    const entorno: Record<string, unknown> = entornoValido();
    delete entorno[campo];

    expect(() => validarEntornoAutenticacionE2e(entorno)).toThrow(
      /Configuración/,
    );
  });

  it("rechaza URLs de base inconsistentes", () => {
    expect(() =>
      validarEntornoAutenticacionE2e({
        ...entornoValido(),
        DIRECT_URL: urlBase.replace("clave-ficticia", "otra-clave"),
      }),
    ).toThrow(/Configuración/);
  });

  it.each(["test", "development"])(
    "rechaza el modo de ejecución no autorizado %s",
    (nodeEnv) => {
      expect(() =>
        validarEntornoAutenticacionE2e({
          ...entornoValido(),
          NODE_ENV: nodeEnv,
        }),
      ).toThrow(/Configuración/);
    },
  );

  it("NODE_ENV=production no habilita E2E sin el indicador explícito", () => {
    expect(
      validarEntornoAutenticacionE2e({
        ...entornoValido(),
        AUTENTICACION_E2E: undefined,
      }),
    ).toBe(false);
  });

  it("rechaza una credencial E2E insuficiente", () => {
    expect(() =>
      validarEntornoAutenticacionE2e({
        ...entornoValido(),
        AUTENTICACION_E2E_CREDENCIAL: "credencial-corta",
      }),
    ).toThrow(/Configuración/);
  });

  it("rechaza un identificador de Usuario E2E inválido", () => {
    expect(() =>
      validarEntornoAutenticacionE2e({
        ...entornoValido(),
        AUTENTICACION_E2E_USUARIO_ID: "usuario-no-uuid",
      }),
    ).toThrow(/Configuración/);
  });

  it("no considera GitHub Actions suficiente para habilitar E2E", () => {
    expect(
      validarEntornoAutenticacionE2e({ GITHUB_ACTIONS: "true" }),
    ).toBe(false);
  });

  it("no expone secretos ni entradas inválidas en el error", () => {
    const secreto = "SECRETO_E2E_NO_PUBLICAR";
    const conexion =
      `postgresql://luqgarage_test:${secreto}@base.example.com:5432/produccion`;

    try {
      validarEntornoAutenticacionE2e({
        ...entornoValido(),
        DATABASE_URL: conexion,
        DIRECT_URL: conexion,
        AUTH_URL: `https://${secreto}.example.com`,
      });
      expect.fail("Debió rechazar el entorno");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(Error);
      if (!(error instanceof Error)) throw error;
      expect(error.message).toMatch(/Configuración/);
      expect(error.cause).toBeUndefined();
      expect(`${error.stack} ${JSON.stringify(error)}`).not.toContain(secreto);
      expect(error.message).not.toContain(conexion);
    }
  });
});
