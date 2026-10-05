import { createClient } from "@supabase/supabase-js";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { subirDocumentoSiniestro } from "./supabaseStorage";

const createClientMock = vi.mocked(createClient);

const variablesStorage = [
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_STORAGE_BUCKET",
] as const;

const valoresEntornoOriginales = new Map<string, string | undefined>();

function configurarEntornoStorage() {
  process.env.SUPABASE_URL = "https://proyecto.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "clave-secreta-de-prueba";
  process.env.SUPABASE_STORAGE_BUCKET = "documentos-siniestros";
}

function configurarClienteConResultado(resultado: unknown) {
  const upload = vi.fn().mockResolvedValue(resultado);
  const from = vi.fn().mockReturnValue({ upload });

  createClientMock.mockReturnValue({ storage: { from } } as never);

  return { from, upload };
}

function archivoDePrueba() {
  return new Blob(["contenido de prueba"], { type: "image/jpeg" });
}

beforeEach(() => {
  for (const variable of variablesStorage) {
    valoresEntornoOriginales.set(variable, process.env[variable]);
  }

  configurarEntornoStorage();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  for (const variable of variablesStorage) {
    const valorOriginal = valoresEntornoOriginales.get(variable);

    if (valorOriginal === undefined) {
      delete process.env[variable];
    } else {
      process.env[variable] = valorOriginal;
    }
  }

  valoresEntornoOriginales.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("subirDocumentoSiniestro", () => {
  it("devuelve CONFIGURACION_INVALIDA cuando falta la configuración requerida", async () => {
    delete process.env.SUPABASE_SECRET_KEY;

    await expect(
      subirDocumentoSiniestro({
        archivo: archivoDePrueba(),
        ruta: "siniestros/prueba/denuncia.jpg",
      }),
    ).resolves.toEqual({ ok: false, motivo: "CONFIGURACION_INVALIDA" });

    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("devuelve la referencia del archivo cuando Supabase confirma la carga", async () => {
    const { from, upload } = configurarClienteConResultado({
      data: {
        id: "archivo-id",
        path: "siniestros/prueba/denuncia.jpg",
        fullPath: "documentos-siniestros/siniestros/prueba/denuncia.jpg",
      },
      error: null,
    });

    await expect(
      subirDocumentoSiniestro({
        archivo: archivoDePrueba(),
        ruta: "siniestros/prueba/denuncia.jpg",
      }),
    ).resolves.toEqual({
      ok: true,
      referenciaArchivo: "siniestros/prueba/denuncia.jpg",
    });

    expect(from).toHaveBeenCalledWith("documentos-siniestros");
    expect(upload).toHaveBeenCalledWith(
      "siniestros/prueba/denuncia.jpg",
      expect.any(Blob),
      { upsert: false },
    );
  });

  it("devuelve ERROR_STORAGE cuando Supabase informa un error de carga", async () => {
    configurarClienteConResultado({
      data: null,
      error: { message: "No se pudo cargar el archivo." },
    });

    await expect(
      subirDocumentoSiniestro({
        archivo: archivoDePrueba(),
        ruta: "siniestros/prueba/denuncia.jpg",
      }),
    ).resolves.toEqual({ ok: false, motivo: "ERROR_STORAGE" });
  });

  it("devuelve RESPUESTA_INVALIDA cuando falta la ruta en la respuesta externa", async () => {
    configurarClienteConResultado({
      data: { id: "archivo-id", fullPath: "documentos-siniestros/archivo" },
      error: null,
    });

    await expect(
      subirDocumentoSiniestro({
        archivo: archivoDePrueba(),
        ruta: "siniestros/prueba/denuncia.jpg",
      }),
    ).resolves.toEqual({ ok: false, motivo: "RESPUESTA_INVALIDA" });
  });

  it("aborta la solicitud al superar el timeout y devuelve TIMEOUT", async () => {
    vi.useFakeTimers();

    const fetchPendiente = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolver, rechazar) => {
          init?.signal?.addEventListener(
            "abort",
            () => rechazar(new DOMException("Solicitud abortada.", "AbortError")),
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetchPendiente);

    createClientMock.mockImplementation((_url, _secretKey, opciones) => {
      const upload = async () => {
        try {
          await opciones?.global?.fetch?.(
            "https://proyecto.supabase.co/storage/v1/object",
          );
        } catch {
          return { data: null, error: { message: "Solicitud abortada." } };
        }

        return {
          data: {
            id: "archivo-id",
            path: "siniestros/prueba/denuncia.jpg",
            fullPath: "documentos-siniestros/siniestros/prueba/denuncia.jpg",
          },
          error: null,
        };
      };

      return { storage: { from: () => ({ upload }) } } as never;
    });

    const resultado = subirDocumentoSiniestro({
      archivo: archivoDePrueba(),
      ruta: "siniestros/prueba/denuncia.jpg",
    });

    await vi.advanceTimersByTimeAsync(10_000);

    await expect(resultado).resolves.toEqual({ ok: false, motivo: "TIMEOUT" });

    const [, opcionesFetch] = fetchPendiente.mock.calls[0] ?? [];
    expect(opcionesFetch?.signal?.aborted).toBe(true);
  });
});
