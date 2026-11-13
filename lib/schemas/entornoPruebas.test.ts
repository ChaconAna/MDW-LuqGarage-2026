import { describe, expect, it } from "vitest";

import { validarEntornoPruebas } from "./entornoPruebas";

const url = "postgresql://luqgarage_test:clave-ficticia@127.0.0.1:5432/luqgarage_test";
const entornoValido = () => ({
  PRUEBAS_PERSISTENCIA: "1", GITHUB_ACTIONS: "true",
  DATABASE_URL: url, DIRECT_URL: url,
});

describe("validarEntornoPruebas", () => {
  it.each([url, url.replace("postgresql:", "postgres:")])("acepta el protocolo PostgreSQL autorizado", (conexion) => {
    expect(() => validarEntornoPruebas({ ...entornoValido(), DATABASE_URL: conexion, DIRECT_URL: conexion })).not.toThrow();
  });

  it.each([undefined, "", "0", "true", "01"])("no activa la protección para el indicador %s", (modo) => {
    expect(() => validarEntornoPruebas({ PRUEBAS_PERSISTENCIA: modo })).not.toThrow();
  });

  it.each([undefined, "", "false", "TRUE"])("exige GitHub Actions: %s", (valor) => {
    expect(() => validarEntornoPruebas({ ...entornoValido(), GITHUB_ACTIONS: valor })).toThrow(/Configuración/);
  });

  it.each(["DATABASE_URL", "DIRECT_URL"])("rechaza %s ausente o vacía", (campo) => {
    for (const valor of [undefined, ""]) {
      expect(() => validarEntornoPruebas({ ...entornoValido(), [campo]: valor })).toThrow(/Configuración/);
    }
  });

  it("rechaza URLs diferentes aunque ambas tengan el destino permitido", () => {
    expect(() => validarEntornoPruebas({ ...entornoValido(), DIRECT_URL: url.replace("clave-ficticia", "otra-clave") })).toThrow(/Configuración/);
  });

  it.each([
    ["malformada", "no-es-url"],
    ["protocolo ajeno", url.replace("postgresql:", "https:")],
    ["host remoto", url.replace("127.0.0.1", "base.example.com")],
    ["localhost", url.replace("127.0.0.1", "localhost")],
    ["puerto ausente", url.replace(":5432", "")],
    ["otro puerto", url.replace(":5432", ":6543")],
    ["otro usuario", url.replace("//luqgarage_test:", "//postgres:")],
    ["otra base", url.replace("/luqgarage_test", "/postgres")],
    ["host por query", url + "?host=base.example.com"],
    ["schema por query", url + "?schema=public"],
    ["options por query", url + "?options=-csearch_path=public"],
    ["query vacía", url + "?"],
    ["fragmento", url + "#destino"],
    ["fragmento vacío", url + "#"],
    ["espacios", " " + url],
    ["salto de línea", url + "\n"],
    ["barra adicional", url + "/"],
  ])("rechaza %s aun con ambas URLs idénticas", (_caso, conexion) => {
    expect(() => validarEntornoPruebas({ ...entornoValido(), DATABASE_URL: conexion, DIRECT_URL: conexion })).toThrow(/Configuración/);
  });

  it("no expone secretos en el error, su stack ni una causa adjunta", () => {
    const secreto = "SECRETO_NO_PUBLICAR";
    const conexion = `postgresql://usuario:${secreto}@remoto.example.com:5432/produccion`;
    try {
      validarEntornoPruebas({ ...entornoValido(), DATABASE_URL: conexion, DIRECT_URL: conexion, GITHUB_ACTIONS: secreto });
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
