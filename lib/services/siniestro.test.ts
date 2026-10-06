import { GradoDano, TipoDocumentoSiniestro } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DatosCreacionSiniestroMultipart } from "../schemas/siniestro";

vi.mock("../db/siniestro", () => ({
  crearSiniestro: vi.fn(),
}));
vi.mock("./supabaseStorage", () => ({
  eliminarDocumentosSiniestro: vi.fn(),
  subirDocumentoSiniestro: vi.fn(),
}));

import { crearSiniestro } from "../db/siniestro";
import {
  eliminarDocumentosSiniestro,
  subirDocumentoSiniestro,
} from "./supabaseStorage";
import {
  esFechaSiniestroValida,
  registrarSiniestroConDocumentos,
} from "./siniestro";

const crearSiniestroMock = vi.mocked(crearSiniestro);
const eliminarDocumentosSiniestroMock = vi.mocked(
  eliminarDocumentosSiniestro,
);
const subirDocumentoSiniestroMock = vi.mocked(subirDocumentoSiniestro);
const randomUUIDMock = vi.fn();

const fechaRegistro = new Date("2026-03-04T12:00:00.000Z");

function crearDatosMultipart(): DatosCreacionSiniestroMultipart {
  return {
    numeroSiniestro: "SIN-2026-0001",
    fechaSiniestro: new Date("2026-03-03T14:30:00.000Z"),
    gradoDano: GradoDano.MODERADO,
    numeroPoliza: "POL-123456",
    clienteId: "11111111-1111-4111-8111-111111111111",
    vehiculoId: "22222222-2222-4222-8222-222222222222",
    aseguradoraId: "33333333-3333-4333-8333-333333333333",
    documentos: [
      {
        tipo: TipoDocumentoSiniestro.DENUNCIA,
        archivo: new File(["denuncia"], "denuncia.jpg"),
      },
      {
        tipo: TipoDocumentoSiniestro.FRONTAL,
        archivo: new File(["frontal"], "frontal.jpg"),
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  randomUUIDMock.mockReset();
  vi.stubGlobal("crypto", { randomUUID: randomUUIDMock });
  eliminarDocumentosSiniestroMock.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("esFechaSiniestroValida", () => {
  it("acepta una fecha de Siniestro anterior a la fecha de registro", () => {
    const fechaSiniestro = new Date("2026-03-01T12:00:00.000Z");
    const fechaRegistro = new Date("2026-03-02T12:00:00.000Z");

    expect(esFechaSiniestroValida(fechaSiniestro, fechaRegistro)).toBe(true);
  });

  it("rechaza una fecha de Siniestro posterior a la fecha de registro", () => {
    const fechaSiniestro = new Date("2026-03-03T12:00:00.000Z");
    const fechaRegistro = new Date("2026-03-02T12:00:00.000Z");

    expect(esFechaSiniestroValida(fechaSiniestro, fechaRegistro)).toBe(false);
  });

  it("acepta fechas de Siniestro y registro exactamente iguales", () => {
    const fechaSiniestro = new Date("2026-03-02T12:00:00.000Z");
    const fechaRegistro = new Date("2026-03-02T12:00:00.000Z");

    expect(esFechaSiniestroValida(fechaSiniestro, fechaRegistro)).toBe(true);
  });
});

describe("registrarSiniestroConDocumentos", () => {
  it("sube todos los documentos, genera rutas server-side y persiste las referencias devueltas", async () => {
    const datos = crearDatosMultipart();
    const resultadoCreado = {
      creado: true,
      siniestro: { id: "siniestro-id" },
    } as never;
    randomUUIDMock
      .mockReturnValueOnce("intento-uuid")
      .mockReturnValueOnce("archivo-uuid-1")
      .mockReturnValueOnce("archivo-uuid-2");
    subirDocumentoSiniestroMock
      .mockResolvedValueOnce({
        ok: true,
        referenciaArchivo: "siniestros/intento-uuid/archivo-uuid-1",
      })
      .mockResolvedValueOnce({
        ok: true,
        referenciaArchivo: "siniestros/intento-uuid/archivo-uuid-2",
      });
    crearSiniestroMock.mockResolvedValue(resultadoCreado);

    await expect(
      registrarSiniestroConDocumentos(datos, fechaRegistro),
    ).resolves.toBe(resultadoCreado);

    expect(subirDocumentoSiniestroMock).toHaveBeenNthCalledWith(1, {
      archivo: datos.documentos[0]?.archivo,
      ruta: "siniestros/intento-uuid/archivo-uuid-1",
    });
    expect(subirDocumentoSiniestroMock).toHaveBeenNthCalledWith(2, {
      archivo: datos.documentos[1]?.archivo,
      ruta: "siniestros/intento-uuid/archivo-uuid-2",
    });
    expect(crearSiniestroMock).toHaveBeenCalledWith(
      {
        ...datos,
        documentos: [
          {
            tipo: TipoDocumentoSiniestro.DENUNCIA,
            referenciaArchivo: "siniestros/intento-uuid/archivo-uuid-1",
          },
          {
            tipo: TipoDocumentoSiniestro.FRONTAL,
            referenciaArchivo: "siniestros/intento-uuid/archivo-uuid-2",
          },
        ],
      },
      fechaRegistro,
    );
  });

  it("no persiste ni compensa cuando falla la primera subida", async () => {
    randomUUIDMock
      .mockReturnValueOnce("intento-uuid")
      .mockReturnValueOnce("archivo-uuid-1");
    subirDocumentoSiniestroMock.mockResolvedValueOnce({
      ok: false,
      motivo: "ERROR_STORAGE",
    });

    await expect(
      registrarSiniestroConDocumentos(crearDatosMultipart(), fechaRegistro),
    ).resolves.toEqual({ creado: false, motivo: "ALMACENAMIENTO_FALLIDO" });

    expect(crearSiniestroMock).not.toHaveBeenCalled();
    expect(eliminarDocumentosSiniestroMock).not.toHaveBeenCalled();
  });

  it("compensa solo las referencias subidas antes de una falla posterior", async () => {
    randomUUIDMock
      .mockReturnValueOnce("intento-uuid")
      .mockReturnValueOnce("archivo-uuid-1")
      .mockReturnValueOnce("archivo-uuid-2");
    subirDocumentoSiniestroMock
      .mockResolvedValueOnce({
        ok: true,
        referenciaArchivo: "siniestros/intento-uuid/archivo-uuid-1",
      })
      .mockResolvedValueOnce({ ok: false, motivo: "TIMEOUT" });

    await expect(
      registrarSiniestroConDocumentos(crearDatosMultipart(), fechaRegistro),
    ).resolves.toEqual({ creado: false, motivo: "ALMACENAMIENTO_FALLIDO" });

    expect(eliminarDocumentosSiniestroMock).toHaveBeenCalledWith({
      rutas: ["siniestros/intento-uuid/archivo-uuid-1"],
    });
    expect(crearSiniestroMock).not.toHaveBeenCalled();
  });

  it("compensa todas las referencias y conserva un rechazo conocido de la base", async () => {
    const rechazo = { creado: false, motivo: "NUMERO_DUPLICADO" } as const;
    randomUUIDMock
      .mockReturnValueOnce("intento-uuid")
      .mockReturnValueOnce("archivo-uuid-1")
      .mockReturnValueOnce("archivo-uuid-2");
    subirDocumentoSiniestroMock
      .mockResolvedValueOnce({
        ok: true,
        referenciaArchivo: "siniestros/intento-uuid/archivo-uuid-1",
      })
      .mockResolvedValueOnce({
        ok: true,
        referenciaArchivo: "siniestros/intento-uuid/archivo-uuid-2",
      });
    crearSiniestroMock.mockResolvedValue(rechazo);

    await expect(
      registrarSiniestroConDocumentos(crearDatosMultipart(), fechaRegistro),
    ).resolves.toEqual(rechazo);

    expect(eliminarDocumentosSiniestroMock).toHaveBeenCalledWith({
      rutas: [
        "siniestros/intento-uuid/archivo-uuid-1",
        "siniestros/intento-uuid/archivo-uuid-2",
      ],
    });
  });

  it("conserva la falla original aunque la compensación falle", async () => {
    randomUUIDMock
      .mockReturnValueOnce("intento-uuid")
      .mockReturnValueOnce("archivo-uuid-1")
      .mockReturnValueOnce("archivo-uuid-2");
    subirDocumentoSiniestroMock
      .mockResolvedValueOnce({
        ok: true,
        referenciaArchivo: "siniestros/intento-uuid/archivo-uuid-1",
      })
      .mockResolvedValueOnce({ ok: false, motivo: "ERROR_STORAGE" });
    eliminarDocumentosSiniestroMock.mockResolvedValue({
      ok: false,
      motivo: "ERROR_STORAGE",
    });

    await expect(
      registrarSiniestroConDocumentos(crearDatosMultipart(), fechaRegistro),
    ).resolves.toEqual({ creado: false, motivo: "ALMACENAMIENTO_FALLIDO" });
  });

  it("propaga una excepción inesperada de la base sin compensar", async () => {
    const errorBase = new Error("Falla inesperada de base de datos.");
    randomUUIDMock
      .mockReturnValueOnce("intento-uuid")
      .mockReturnValueOnce("archivo-uuid-1")
      .mockReturnValueOnce("archivo-uuid-2");
    subirDocumentoSiniestroMock
      .mockResolvedValueOnce({
        ok: true,
        referenciaArchivo: "siniestros/intento-uuid/archivo-uuid-1",
      })
      .mockResolvedValueOnce({
        ok: true,
        referenciaArchivo: "siniestros/intento-uuid/archivo-uuid-2",
      });
    crearSiniestroMock.mockRejectedValue(errorBase);

    await expect(
      registrarSiniestroConDocumentos(crearDatosMultipart(), fechaRegistro),
    ).rejects.toBe(errorBase);

    expect(eliminarDocumentosSiniestroMock).not.toHaveBeenCalled();
  });
});
