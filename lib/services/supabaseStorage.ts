import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const TIMEOUT_SUBIDA_MS = 10_000;

const respuestaSubidaStorageSchema = z
  .object({
    path: z.string().min(1),
  })
  .passthrough();

const respuestaEliminacionStorageSchema = z.array(
  z
    .object({
      name: z.string().min(1),
    })
    .passthrough(),
);

type MotivoFallaStorage =
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
      motivo: MotivoFallaStorage;
    };

export type ResultadoEliminacionDocumentosSiniestro =
  | {
      ok: true;
    }
  | {
      ok: false;
      motivo: MotivoFallaStorage;
    };

type ConfiguracionStorage = {
  url: string;
  secretKey: string;
  bucket: string;
};

function registrarFallaStorage(
  operacion: "subida" | "eliminacion",
  motivo: MotivoFallaStorage,
) {
  console.error("Falló una operación de documentación en Supabase Storage.", {
    servicio: "supabase-storage",
    operacion,
    motivo,
  });
}

function obtenerConfiguracionStorage(
  operacion: "subida" | "eliminacion",
): ConfiguracionStorage | null {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;

  if (!url || !secretKey || !bucket) {
    registrarFallaStorage(operacion, "CONFIGURACION_INVALIDA");
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
  const configuracion = obtenerConfiguracionStorage("subida");

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
      registrarFallaStorage("subida", motivo);
      return { ok: false, motivo };
    }

    const respuesta = respuestaSubidaStorageSchema.safeParse(resultado.data);

    if (!respuesta.success) {
      registrarFallaStorage("subida", "RESPUESTA_INVALIDA");
      return { ok: false, motivo: "RESPUESTA_INVALIDA" };
    }

    return { ok: true, referenciaArchivo: respuesta.data.path };
  } catch {
    const motivo = seSuperoTimeout() ? "TIMEOUT" : "ERROR_STORAGE";
    registrarFallaStorage("subida", motivo);
    return { ok: false, motivo };
  }
}

export async function eliminarDocumentosSiniestro({
  rutas,
}: {
  rutas: readonly string[];
}): Promise<ResultadoEliminacionDocumentosSiniestro> {
  const configuracion = obtenerConfiguracionStorage("eliminacion");

  if (!configuracion) {
    return { ok: false, motivo: "CONFIGURACION_INVALIDA" };
  }

  const { cliente, seSuperoTimeout } = crearClienteStorage(configuracion);

  try {
    const resultado = await cliente.storage
      .from(configuracion.bucket)
      .remove([...rutas]);

    if (resultado.error) {
      const motivo = seSuperoTimeout() ? "TIMEOUT" : "ERROR_STORAGE";
      registrarFallaStorage("eliminacion", motivo);
      return { ok: false, motivo };
    }

    const respuesta = respuestaEliminacionStorageSchema.safeParse(
      resultado.data,
    );

    if (!respuesta.success || respuesta.data.length !== rutas.length) {
      registrarFallaStorage("eliminacion", "RESPUESTA_INVALIDA");
      return { ok: false, motivo: "RESPUESTA_INVALIDA" };
    }

    return { ok: true };
  } catch {
    const motivo = seSuperoTimeout() ? "TIMEOUT" : "ERROR_STORAGE";
    registrarFallaStorage("eliminacion", motivo);
    return { ok: false, motivo };
  }
}
