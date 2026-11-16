import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import {
  archivoStorageE2eSchema,
  cuerpoEliminacionStorageE2eSchema,
  rutaObjetoStorageE2eSchema,
} from "../schemas/storageHttpE2e";
import { validarEntornoAutenticacionE2e } from "../schemas/entornoE2e";

export const BUCKET_STORAGE_E2E = "documentos-siniestros-e2e";
export const PUERTO_STORAGE_E2E = 54321;
export const URL_STORAGE_E2E = `http://127.0.0.1:${PUERTO_STORAGE_E2E}`;

const HOST_STORAGE_E2E = "127.0.0.1";
const LIMITE_CUERPO_BYTES = 5 * 1024 * 1024;
const RUTA_INSPECCION = "/__e2e/storage/objetos";

type ObjetoStorageE2e = {
  contenido: Uint8Array;
  id: string;
  tipo: string;
};

export type ServidorStorageHttpE2e = {
  bucket: typeof BUCKET_STORAGE_E2E;
  credencial: string;
  detener: () => Promise<void>;
  puerto: number;
  url: string;
};

class ErrorStorageHttpE2e extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorStorageHttpE2e";
  }
}

export function crearCredencialStorageE2e(credencialAutenticacion: string) {
  return createHash("sha256")
    .update(`luqgarage-storage-e2e:${credencialAutenticacion}`)
    .digest("hex");
}

function validarEntornoStorageE2e() {
  if (
    !validarEntornoAutenticacionE2e(process.env)
  ) {
    throw new ErrorStorageHttpE2e("El Storage HTTP E2E no esta habilitado.");
  }
}

function coincideSecreto(recibido: string | undefined, esperado: string) {
  if (!recibido) return false;

  const recibidoBuffer = Buffer.from(recibido);
  const esperadoBuffer = Buffer.from(esperado);

  return (
    recibidoBuffer.length === esperadoBuffer.length &&
    timingSafeEqual(recibidoBuffer, esperadoBuffer)
  );
}

function solicitudAutorizada(
  solicitud: IncomingMessage,
  credencial: string,
) {
  const apiKey = solicitud.headers.apikey;
  const autorizacion = solicitud.headers.authorization;

  return (
    typeof apiKey === "string" &&
    coincideSecreto(apiKey, credencial) &&
    coincideSecreto(autorizacion, `Bearer ${credencial}`)
  );
}

function responderJson(
  respuesta: ServerResponse,
  estado: number,
  cuerpo: unknown,
) {
  respuesta.writeHead(estado, { "content-type": "application/json; charset=utf-8" });
  respuesta.end(JSON.stringify(cuerpo));
}

function responderError(
  respuesta: ServerResponse,
  estado: number,
  mensaje: string,
) {
  responderJson(respuesta, estado, {
    error: "StorageE2eError",
    message: mensaje,
    statusCode: String(estado),
  });
}

async function leerCuerpo(
  solicitud: IncomingMessage,
): Promise<Uint8Array | null> {
  const partes: Buffer[] = [];
  let cantidad = 0;

  for await (const parte of solicitud) {
    const buffer = Buffer.isBuffer(parte) ? parte : Buffer.from(parte);
    cantidad += buffer.length;

    if (cantidad > LIMITE_CUERPO_BYTES) return null;
    partes.push(buffer);
  }

  return Buffer.concat(partes);
}

async function obtenerArchivoMultipart(
  solicitud: IncomingMessage,
  cuerpo: Uint8Array,
) {
  const tipoContenido = solicitud.headers["content-type"];
  if (!tipoContenido?.startsWith("multipart/form-data;")) return null;

  try {
    const peticion = new Request("http://127.0.0.1/storage-e2e", {
      method: "POST",
      headers: { "content-type": tipoContenido },
      body: new Uint8Array(cuerpo).buffer,
    });
    const formulario = await peticion.formData();
    const archivos = Array.from(formulario.values()).filter(
      (valor): valor is File => typeof valor !== "string",
    );

    if (archivos.length !== 1) return null;

    const resultado = archivoStorageE2eSchema.safeParse(archivos[0]);
    return resultado.success ? resultado.data : null;
  } catch {
    return null;
  }
}

function extraerRutaUpload(pathname: string) {
  const prefijo = `/storage/v1/object/${BUCKET_STORAGE_E2E}/`;
  if (!pathname.startsWith(prefijo)) return null;

  try {
    return decodeURIComponent(pathname.slice(prefijo.length));
  } catch {
    return null;
  }
}

async function procesarUpload({
  solicitud,
  respuesta,
  pathname,
  objetos,
}: {
  solicitud: IncomingMessage;
  respuesta: ServerResponse;
  pathname: string;
  objetos: Map<string, ObjetoStorageE2e>;
}) {
  if (solicitud.method !== "POST") {
    responderError(respuesta, 405, "Metodo no permitido.");
    return;
  }

  if (solicitud.headers["x-upsert"] !== "false") {
    responderError(respuesta, 400, "El Storage E2E no admite sobrescrituras.");
    return;
  }

  const ruta = extraerRutaUpload(pathname);
  const rutaValida = rutaObjetoStorageE2eSchema.safeParse(ruta);
  if (!rutaValida.success) {
    responderError(respuesta, 400, "Ruta no autorizada.");
    return;
  }

  if (objetos.has(rutaValida.data)) {
    responderError(respuesta, 409, "El objeto ya existe.");
    return;
  }

  const cuerpo = await leerCuerpo(solicitud);
  if (!cuerpo) {
    responderError(respuesta, 413, "El cuerpo excede el limite permitido.");
    return;
  }

  const archivo = await obtenerArchivoMultipart(solicitud, cuerpo);
  if (!archivo) {
    responderError(respuesta, 400, "Archivo invalido.");
    return;
  }

  const id = randomUUID();
  objetos.set(rutaValida.data, {
    contenido: new Uint8Array(await archivo.arrayBuffer()),
    id,
    tipo: archivo.type,
  });

  responderJson(respuesta, 200, {
    Id: id,
    Key: `${BUCKET_STORAGE_E2E}/${rutaValida.data}`,
  });
}

async function procesarEliminacion({
  solicitud,
  respuesta,
  objetos,
}: {
  solicitud: IncomingMessage;
  respuesta: ServerResponse;
  objetos: Map<string, ObjetoStorageE2e>;
}) {
  if (solicitud.method !== "DELETE") {
    responderError(respuesta, 405, "Metodo no permitido.");
    return;
  }

  const cuerpo = await leerCuerpo(solicitud);
  if (!cuerpo) {
    responderError(respuesta, 413, "El cuerpo excede el limite permitido.");
    return;
  }

  let entrada: unknown;
  try {
    entrada = JSON.parse(Buffer.from(cuerpo).toString("utf8"));
  } catch {
    responderError(respuesta, 400, "Cuerpo invalido.");
    return;
  }

  const resultado = cuerpoEliminacionStorageE2eSchema.safeParse(entrada);
  if (!resultado.success || new Set(resultado.data.prefixes).size !== resultado.data.prefixes.length) {
    responderError(respuesta, 400, "Rutas de eliminacion invalidas.");
    return;
  }

  if (resultado.data.prefixes.some((ruta) => !objetos.has(ruta))) {
    responderError(respuesta, 404, "No se encontraron todos los objetos.");
    return;
  }

  const eliminados = resultado.data.prefixes.map((ruta) => {
    const objeto = objetos.get(ruta)!;
    objetos.delete(ruta);
    return {
      id: objeto.id,
      name: ruta,
      metadata: { mimetype: objeto.tipo, size: objeto.contenido.byteLength },
    };
  });

  responderJson(respuesta, 200, eliminados);
}

export async function iniciarStorageHttpE2e({
  puerto = 0,
}: {
  puerto?: number;
} = {}): Promise<ServidorStorageHttpE2e> {
  validarEntornoStorageE2e();

  const credencialAutenticacion = process.env.AUTENTICACION_E2E_CREDENCIAL!;
  const credencial = crearCredencialStorageE2e(credencialAutenticacion);
  const objetos = new Map<string, ObjetoStorageE2e>();
  let estado: "activo" | "deteniendo" | "fallo" | "detenido" = "activo";
  let promesaDetencion: Promise<void> | null = null;

  const servidor = createServer(async (solicitud, respuesta) => {
    if (estado !== "activo") {
      responderError(respuesta, 503, "El Storage E2E se esta deteniendo.");
      return;
    }

    try {
      const pathname = new URL(
        solicitud.url ?? "/",
        `http://${HOST_STORAGE_E2E}`,
      ).pathname;

      if (!solicitudAutorizada(solicitud, credencial)) {
        responderError(respuesta, 401, "Credenciales invalidas.");
        return;
      }

      if (pathname === RUTA_INSPECCION) {
        if (solicitud.method !== "GET") {
          responderError(respuesta, 405, "Metodo no permitido.");
          return;
        }

        responderJson(respuesta, 200, {
          cantidad: objetos.size,
          objetos: Array.from(objetos.entries(), ([ruta, objeto]) => ({
            ruta,
            tamano: objeto.contenido.byteLength,
          })),
        });
        return;
      }

      const rutaBucket = `/storage/v1/object/${BUCKET_STORAGE_E2E}`;
      if (pathname === rutaBucket) {
        await procesarEliminacion({ solicitud, respuesta, objetos });
        return;
      }

      if (pathname.startsWith("/storage/v1/object/")) {
        if (!pathname.startsWith(`${rutaBucket}/`)) {
          responderError(respuesta, 403, "Bucket no autorizado.");
          return;
        }

        await procesarUpload({ solicitud, respuesta, pathname, objetos });
        return;
      }

      responderError(respuesta, 404, "Endpoint no implementado.");
    } catch {
      if (!respuesta.headersSent) {
        responderError(respuesta, 500, "Fallo interno del Storage E2E.");
      } else {
        respuesta.end();
      }
    }
  });

  await new Promise<void>((resolver, rechazar) => {
    const fallo = (error: Error) => rechazar(error);
    servidor.once("error", fallo);
    servidor.listen(puerto, HOST_STORAGE_E2E, () => {
      servidor.off("error", fallo);
      resolver();
    });
  });

  const direccion = servidor.address();
  if (!direccion || typeof direccion === "string") {
    servidor.close();
    throw new ErrorStorageHttpE2e("No se pudo determinar el puerto del Storage E2E.");
  }

  return {
    bucket: BUCKET_STORAGE_E2E,
    credencial,
    puerto: direccion.port,
    url: `http://${HOST_STORAGE_E2E}:${direccion.port}`,
    detener: () => {
      if (estado === "detenido") return Promise.resolve();
      if (estado === "deteniendo" && promesaDetencion) return promesaDetencion;

      estado = "deteniendo";
      promesaDetencion = (async () => {
        let cierreConfirmado = false;

        try {
          await new Promise<void>((resolver, rechazar) => {
            try {
              servidor.close((error) =>
                error ? rechazar(error) : resolver(),
              );
              servidor.closeIdleConnections();
            } catch (error: unknown) {
              rechazar(error);
            }
          });
          cierreConfirmado = true;
        } catch (error: unknown) {
          servidor.closeAllConnections();
          throw error;
        } finally {
          objetos.clear();
          estado = cierreConfirmado || !servidor.listening ? "detenido" : "fallo";
          promesaDetencion = null;
        }
      })();

      return promesaDetencion;
    },
  };
}
