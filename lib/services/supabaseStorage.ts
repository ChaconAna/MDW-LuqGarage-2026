import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const TIMEOUT_SUBIDA_MS = 10_000;

const respuestaSubidaStorageSchema = z
  .object({
    path: z.string().min(1),
  })
  .passthrough();

type MotivoFallaSubidaDocumento =
  | "CONFIGURACION_INVALIDA"
  | "TIMEOUT"
  | "ERROR_STORAGE"
  | "RESPUESTA_INVALIDA";

export type ResultadoSubidaDocumentoSiniestro =
  | {
      ok: true;
      referenciaArchivo: string;
    }
  | {
      ok: false;
      motivo: MotivoFallaSubidaDocumento;
    };

type ConfiguracionStorage = {
  url: string;
  secretKey: string;
  bucket: string;
};

function registrarFallaSubida(motivo: MotivoFallaSubidaDocumento) {
  console.error("Falló la subida de documentación a Supabase Storage.", {
    servicio: "supabase-storage",
    motivo,
  });
}

function obtenerConfiguracionStorage(): ConfiguracionStorage | null {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;

  if (!url || !secretKey || !bucket) {
    registrarFallaSubida("CONFIGURACION_INVALIDA");
    return null;
  }

  return { url, secretKey, bucket };
}

function crearClienteStorage(configuracion: ConfiguracionStorage) {
  let timeoutSuperado = false;

  const fetchConTimeout: typeof fetch = async (input, init) => {
    const controlador = new AbortController();
    const cancelarPorSenalExterna = () => controlador.abort();

    init?.signal?.addEventListener("abort", cancelarPorSenalExterna, {
      once: true,
    });

    const timeout = setTimeout(() => {
      timeoutSuperado = true;
      controlador.abort();
    }, TIMEOUT_SUBIDA_MS);

    try {
      return await fetch(input, {
        ...init,
        signal: controlador.signal,
      });
    } finally {
      clearTimeout(timeout);
      init?.signal?.removeEventListener("abort", cancelarPorSenalExterna);
    }
  };

  return {
    cliente: createClient(configuracion.url, configuracion.secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: fetchConTimeout,
      },
    }),
    seSuperoTimeout: () => timeoutSuperado,
  };
}

export async function subirDocumentoSiniestro({
  archivo,
  ruta,
}: {
  archivo: Blob;
  ruta: string;
}): Promise<ResultadoSubidaDocumentoSiniestro> {
  const configuracion = obtenerConfiguracionStorage();

  if (!configuracion) {
    return { ok: false, motivo: "CONFIGURACION_INVALIDA" };
  }

  const { cliente, seSuperoTimeout } = crearClienteStorage(configuracion);

  try {
    const resultado = await cliente.storage
      .from(configuracion.bucket)
      .upload(ruta, archivo, { upsert: false });

    if (resultado.error) {
      const motivo = seSuperoTimeout() ? "TIMEOUT" : "ERROR_STORAGE";
      registrarFallaSubida(motivo);
      return { ok: false, motivo };
    }

    const respuesta = respuestaSubidaStorageSchema.safeParse(resultado.data);

    if (!respuesta.success) {
      registrarFallaSubida("RESPUESTA_INVALIDA");
      return { ok: false, motivo: "RESPUESTA_INVALIDA" };
    }

    return { ok: true, referenciaArchivo: respuesta.data.path };
  } catch {
    const motivo = seSuperoTimeout() ? "TIMEOUT" : "ERROR_STORAGE";
    registrarFallaSubida(motivo);
    return { ok: false, motivo };
  }
}
