import { GradoDano, TipoDocumentoSiniestro } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  construirMultipartRegistroSiniestro,
  LIMITE_ENVIO_SINIESTRO_BYTES,
  MENSAJE_LIMITE_SINIESTRO,
} from "../../../../lib/services/registroSiniestroFormulario";

const dependencias = vi.hoisted(() => ({
  ErrorAutenticacion: class ErrorAutenticacion extends Error {},
  ErrorAutorizacion: class ErrorAutorizacion extends Error {},
  requerirRol: vi.fn(),
  registrarSiniestroConDocumentos: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  ErrorAutenticacion: dependencias.ErrorAutenticacion,
  ErrorAutorizacion: dependencias.ErrorAutorizacion,
  requerirRol: dependencias.requerirRol,
}));
vi.mock("next/cache", () => ({ revalidatePath: dependencias.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: dependencias.redirect }));

// Permiten reutilizar el predicado de fecha real sin cargar persistencia ni Storage.
vi.mock("../../../../lib/db/siniestro", () => ({ crearSiniestro: vi.fn() }));
vi.mock("../../../../lib/services/supabaseStorage", () => ({
  subirDocumentoSiniestro: vi.fn(),
  eliminarDocumentosSiniestro: vi.fn(),
}));
vi.mock("@/lib/services/siniestro", async () => {
  const { esFechaSiniestroValida } = await import("../../../../lib/services/siniestro");
  return {
    esFechaSiniestroValida,
    registrarSiniestroConDocumentos: dependencias.registrarSiniestroConDocumentos,
  };
});
vi.mock("@/lib/schemas/registroSiniestroFormulario", async () =>
  import("../../../../lib/schemas/registroSiniestroFormulario"),
);
vi.mock("@/lib/services/registroSiniestroFormulario", async () =>
  import("../../../../lib/services/registroSiniestroFormulario"),
);
vi.mock("@/lib/services/siniestroMultipart", async () =>
  import("../../../../lib/services/siniestroMultipart"),
);

import { registrarSiniestroAction } from "./actions";

const interrupcionRedireccion = new Error("NEXT_REDIRECT_SIMULADO");
const idSiniestro = "44444444-4444-4444-8444-444444444444";
const instanteRegistro = new Date("2026-11-10T15:00:00.000Z");

function formularioValido() {
  return construirMultipartRegistroSiniestro({
    numeroSiniestro: "SIN-PRUEBA",
    fechaSiniestro: "2026-11-05",
    gradoDano: GradoDano.MODERADO,
    numeroPoliza: "POL-PRUEBA",
    clienteId: "11111111-1111-4111-8111-111111111111",
    vehiculoId: "22222222-2222-4222-8222-222222222222",
    aseguradoraId: "33333333-3333-4333-8333-333333333333",
  }, Object.values(TipoDocumentoSiniestro)
    .filter((tipo) => tipo !== TipoDocumentoSiniestro.ADICIONAL)
    .map((tipo) => ({ tipo, archivo: new File(["foto simulada"], `${tipo}.jpg`) })));
}

function sinRedireccion() {
  expect(dependencias.revalidatePath).not.toHaveBeenCalled();
  expect(dependencias.redirect).not.toHaveBeenCalled();
}

function sinRegistro() {
  expect(dependencias.registrarSiniestroConDocumentos).not.toHaveBeenCalled();
  sinRedireccion();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(instanteRegistro);
  dependencias.requerirRol.mockResolvedValue({ id: "usuario-simulado", rol: "RECEPCIONISTA" });
  dependencias.registrarSiniestroConDocumentos.mockResolvedValue({
    creado: true, siniestro: { id: idSiniestro },
  });
  dependencias.redirect.mockImplementation(() => { throw interrupcionRedireccion; });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("registrarSiniestroAction", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])(
    "autoriza %s antes de registrar, revalida y propaga la redirección de éxito",
    async (rol) => {
      dependencias.requerirRol.mockResolvedValue({ id: "usuario-simulado", rol });
      await expect(registrarSiniestroAction({ errores: {} }, formularioValido())).rejects.toBe(interrupcionRedireccion);

      expect(dependencias.requerirRol).toHaveBeenCalledExactlyOnceWith(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
      expect(dependencias.registrarSiniestroConDocumentos).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          numeroSiniestro: "SIN-PRUEBA",
          fechaSiniestro: new Date("2026-11-05T03:00:00.000Z"),
          clienteId: "11111111-1111-4111-8111-111111111111",
          vehiculoId: "22222222-2222-4222-8222-222222222222",
          aseguradoraId: "33333333-3333-4333-8333-333333333333",
          documentos: expect.arrayContaining([expect.objectContaining({ archivo: expect.any(File) })]),
        }), instanteRegistro,
      );
      expect(dependencias.revalidatePath).toHaveBeenCalledExactlyOnceWith("/siniestros");
      expect(dependencias.redirect).toHaveBeenCalledExactlyOnceWith(`/siniestros/${idSiniestro}`);
      expect(dependencias.requerirRol.mock.invocationCallOrder[0]).toBeLessThan(dependencias.registrarSiniestroConDocumentos.mock.invocationCallOrder[0]!);
      expect(dependencias.registrarSiniestroConDocumentos.mock.invocationCallOrder[0]).toBeLessThan(dependencias.revalidatePath.mock.invocationCallOrder[0]!);
      expect(dependencias.revalidatePath.mock.invocationCallOrder[0]).toBeLessThan(dependencias.redirect.mock.invocationCallOrder[0]!);
    },
  );

  it.each([
    [new dependencias.ErrorAutenticacion(), /sesión/],
    [new dependencias.ErrorAutorizacion(), /permisos/],
  ] as const)("no registra cuando falla la autorización: %s", async (error, mensaje) => {
    dependencias.requerirRol.mockRejectedValue(error);
    const resultado = await registrarSiniestroAction({ errores: {} }, formularioValido());
    expect(resultado.errorGeneral).toMatch(mensaje);
    sinRegistro();
  });

  it.each([
    ["numeroSiniestro", ""],
    ["numeroPoliza", ""],
    ["gradoDano", "DESCONOCIDO"],
    ["clienteId", "no-es-uuid"],
    ["vehiculoId", "no-es-uuid"],
    ["aseguradoraId", "no-es-uuid"],
    ["fechaSiniestro", "2026-02-30"],
    ["fechaSiniestro", "2026-11-11"],
  ] as const)("devuelve un error de campo para %s=%s", async (campo, valor) => {
    const formData = formularioValido();
    formData.set(campo, valor);
    const resultado = await registrarSiniestroAction({ errores: {} }, formData);
    expect(resultado.errores[campo]).toEqual(expect.any(String));
    sinRegistro();
  });

  it("compara la fecha con el instante actual, incluso antes de medianoche argentina", async () => {
    vi.setSystemTime(new Date("2026-11-10T02:59:59.000Z"));
    const formData = formularioValido();
    formData.set("fechaSiniestro", "2026-11-10");
    const resultado = await registrarSiniestroAction({ errores: {} }, formData);
    expect(resultado.errores.fechaSiniestro).toMatch(/posterior/);
    sinRegistro();
  });

  it.each(["ausente", "duplicada"])("rechaza documentación obligatoria %s", async (caso) => {
    const formData = formularioValido();
    if (caso === "ausente") {
      formData.delete("documentos[0][tipo]");
      formData.delete("documentos[0][archivo]");
    } else {
      formData.set("documentos[6][tipo]", TipoDocumentoSiniestro.DENUNCIA);
      formData.set("documentos[6][archivo]", new File(["otra"], "otra.jpg"));
    }
    const resultado = await registrarSiniestroAction({ errores: {} }, formData);
    expect(resultado.errores.documentos).toEqual(expect.any(String));
    sinRegistro();
  });

  it("rechaza un archivo vacío con error en su categoría", async () => {
    const formData = formularioValido();
    const categoria = formData.get("documentos[0][tipo]");
    formData.set("documentos[0][archivo]", new File([], "vacio.jpg"));
    const resultado = await registrarSiniestroAction({ errores: {} }, formData);
    expect(Object.entries(resultado.errores)).toContainEqual([categoria, expect.stringMatching(/vacío/)]);
    sinRegistro();
  });

  it("entrega adicionales al servicio sin aceptar referencias de Storage del navegador", async () => {
    const formData = formularioValido();
    formData.set("documentos[6][tipo]", TipoDocumentoSiniestro.ADICIONAL);
    formData.set("documentos[6][archivo]", new File(["adicional"], "adicional.jpg"));
    await expect(registrarSiniestroAction({ errores: {} }, formData)).rejects.toBe(interrupcionRedireccion);
    expect(dependencias.registrarSiniestroConDocumentos).toHaveBeenCalledWith(
      expect.objectContaining({ documentos: expect.arrayContaining([
        { tipo: TipoDocumentoSiniestro.ADICIONAL, archivo: expect.objectContaining({ name: "adicional.jpg" }) },
      ]) }), instanteRegistro,
    );
  });

  it.each([
    ["numeroSiniestro", "repetido"],
    ["documentos[0][referenciaArchivo]", "referencia-arbitraria"],
    ["campoDesconocido", "valor"],
  ])("rechaza campos repetidos o desconocidos: %s", async (campo, valor) => {
    const formData = formularioValido();
    formData.append(campo, valor);
    const resultado = await registrarSiniestroAction({ errores: {} }, formData);
    expect(resultado.errorGeneral).toEqual(expect.any(String));
    sinRegistro();
  });

  it("rechaza un envío que excede 4 MiB sin registrar", async () => {
    const formData = formularioValido();
    formData.set("documentos[0][archivo]", new File([new Uint8Array(LIMITE_ENVIO_SINIESTRO_BYTES)], "grande.jpg"));
    const resultado = await registrarSiniestroAction({ errores: {} }, formData);
    expect(resultado.errorGeneral).toBe(MENSAJE_LIMITE_SINIESTRO);
    sinRegistro();
  });

  it.each([
    ["NUMERO_DUPLICADO", "numeroSiniestro"],
    ["CLIENTE_NO_ENCONTRADO", "clienteId"],
    ["CLIENTE_INACTIVO", "clienteId"],
    ["VEHICULO_NO_ENCONTRADO", "vehiculoId"],
    ["VEHICULO_INACTIVO", "vehiculoId"],
    ["ASEGURADORA_NO_ENCONTRADA", "aseguradoraId"],
    ["ASEGURADORA_INACTIVA", "aseguradoraId"],
  ] as const)("traduce %s al campo %s", async (motivo, campo) => {
    dependencias.registrarSiniestroConDocumentos.mockResolvedValue({ creado: false, motivo });
    const resultado = await registrarSiniestroAction({ errores: {} }, formularioValido());
    expect(resultado.errores[campo]).toEqual(expect.any(String));
    sinRedireccion();
  });

  it("informa la falla de Storage y no redirige", async () => {
    dependencias.registrarSiniestroConDocumentos.mockResolvedValue({ creado: false, motivo: "ALMACENAMIENTO_FALLIDO" });
    const resultado = await registrarSiniestroAction({ errores: {} }, formularioValido());
    expect(resultado.errorGeneral).toMatch(/almacenar la documentación/);
    sinRedireccion();
  });

  it("no expone una excepción inesperada ni redirige o reintenta", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    dependencias.registrarSiniestroConDocumentos.mockRejectedValue(new Error("detalle-interno-simulado"));
    const resultado = await registrarSiniestroAction({ errores: {} }, formularioValido());
    expect(resultado.errorGeneral).toMatch(/No pudimos confirmar/);
    expect(JSON.stringify(resultado)).not.toContain("detalle-interno-simulado");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("detalle-interno-simulado");
    expect(dependencias.registrarSiniestroConDocumentos).toHaveBeenCalledTimes(1);
    sinRedireccion();
  });
});
