import { request, Server } from "node:http";

import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BUCKET_STORAGE_E2E,
  iniciarStorageHttpE2e,
  type ServidorStorageHttpE2e,
} from "./storageHttpE2e";

const credencialAutenticacion = "credencial-autenticacion-e2e-sintetica-1234567890";
const urlPostgresSintetica =
  "postgresql://luqgarage_test:credencial-sintetica@127.0.0.1:5432/luqgarage_test";

const entornoE2e = {
  AUTENTICACION_E2E: "1",
  AUTENTICACION_E2E_CREDENCIAL: credencialAutenticacion,
  AUTENTICACION_E2E_USUARIO_ID: "11111111-1111-4111-8111-111111111111",
  DATABASE_URL: urlPostgresSintetica,
  DIRECT_URL: urlPostgresSintetica,
  GITHUB_ACTIONS: "true",
  NODE_ENV: "production",
  AUTH_URL: "http://127.0.0.1:3000",
};

const variablesEntorno = Object.keys(entornoE2e) as Array<keyof typeof entornoE2e>;
const entornoOriginal = new Map<string, string | undefined>();
const entornoProceso = process.env as Record<string, string | undefined>;

const ruta = "siniestros/11111111-1111-4111-8111-111111111111/denuncia";
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

let servidor: ServidorStorageHttpE2e | undefined;

function clienteStorage(
  instancia: ServidorStorageHttpE2e,
  credencial = instancia.credencial,
) {
  return createClient(instancia.url, credencial, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  }).storage;
}

function encabezadosAutorizados(instancia: ServidorStorageHttpE2e) {
  return {
    apikey: instancia.credencial,
    authorization: `Bearer ${instancia.credencial}`,
  };
}

async function inspeccionar(instancia: ServidorStorageHttpE2e) {
  const respuesta = await fetch(`${instancia.url}/__e2e/storage/objetos`, {
    headers: encabezadosAutorizados(instancia),
  });

  expect(respuesta.status).toBe(200);
  return respuesta.json() as Promise<{
    cantidad: number;
    objetos: Array<{ ruta: string; tamano: number }>;
  }>;
}

beforeEach(async () => {
  for (const variable of variablesEntorno) {
    entornoOriginal.set(variable, entornoProceso[variable]);
    entornoProceso[variable] = entornoE2e[variable];
  }

  servidor = await iniciarStorageHttpE2e();
});

afterEach(async () => {
  try {
    await servidor?.detener();
  } finally {
    servidor = undefined;
    vi.restoreAllMocks();

    for (const variable of variablesEntorno) {
      const original = entornoOriginal.get(variable);
      if (original === undefined) delete entornoProceso[variable];
      else entornoProceso[variable] = original;
    }
    entornoOriginal.clear();
  }
});

describe("Storage HTTP E2E", () => {
  it("carga un PNG mediante el SDK real y permite inspeccionarlo con autenticacion", async () => {
    const resultado = await clienteStorage(servidor!).from(BUCKET_STORAGE_E2E).upload(
      ruta,
      new Blob([png], { type: "image/png" }),
      { upsert: false },
    );

    expect(resultado.error).toBeNull();
    expect(resultado.data).toMatchObject({
      path: ruta,
      fullPath: `${BUCKET_STORAGE_E2E}/${ruta}`,
    });
    await expect(inspeccionar(servidor!)).resolves.toEqual({
      cantidad: 1,
      objetos: [{ ruta, tamano: png.byteLength }],
    });
  });

  it("rechaza una ruta duplicada cuando upsert es false", async () => {
    const storage = clienteStorage(servidor!).from(BUCKET_STORAGE_E2E);
    const archivo = new Blob([png], { type: "image/png" });

    expect((await storage.upload(ruta, archivo, { upsert: false })).error).toBeNull();
    expect((await storage.upload(ruta, archivo, { upsert: false })).error).not.toBeNull();
    await expect(inspeccionar(servidor!)).resolves.toMatchObject({ cantidad: 1 });
  });

  it("elimina un objeto mediante remove del SDK real", async () => {
    const storage = clienteStorage(servidor!).from(BUCKET_STORAGE_E2E);
    await storage.upload(ruta, new Blob([png], { type: "image/png" }), {
      upsert: false,
    });

    const resultado = await storage.remove([ruta]);

    expect(resultado.error).toBeNull();
    expect(resultado.data).toEqual([
      expect.objectContaining({ name: ruta }),
    ]);
    await expect(inspeccionar(servidor!)).resolves.toEqual({
      cantidad: 0,
      objetos: [],
    });
  });

  it("rechaza credenciales invalidas", async () => {
    const resultado = await clienteStorage(
      servidor!,
      "credencial-storage-invalida-1234567890",
    )
      .from(BUCKET_STORAGE_E2E)
      .upload(ruta, new Blob([png], { type: "image/png" }), { upsert: false });

    expect(resultado.error).not.toBeNull();
    await expect(inspeccionar(servidor!)).resolves.toMatchObject({ cantidad: 0 });
  });

  it("rechaza solicitudes mayores a 5 MiB mientras recibe el cuerpo", async () => {
    const resultado = await clienteStorage(servidor!)
      .from(BUCKET_STORAGE_E2E)
      .upload(
        ruta,
        new Blob([new Uint8Array(5 * 1024 * 1024)], { type: "image/png" }),
        { upsert: false },
      );

    expect(resultado.error).not.toBeNull();
    await expect(inspeccionar(servidor!)).resolves.toMatchObject({ cantidad: 0 });
  });

  it("rechaza DELETE sin autenticacion", async () => {
    const respuesta = await fetch(
      `${servidor!.url}/storage/v1/object/${BUCKET_STORAGE_E2E}`,
      {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prefixes: [ruta] }),
      },
    );

    expect(respuesta.status).toBe(401);
  });

  it("protege tambien el endpoint de inspeccion", async () => {
    const respuesta = await fetch(`${servidor!.url}/__e2e/storage/objetos`);

    expect(respuesta.status).toBe(401);
  });

  it("rechaza rutas y buckets no autorizados", async () => {
    const storage = clienteStorage(servidor!);
    const archivo = new Blob([png], { type: "image/png" });

    const [rutaInvalida, bucketInvalido] = await Promise.all([
      storage
        .from(BUCKET_STORAGE_E2E)
        .upload("otro/archivo.png", archivo, { upsert: false }),
      storage
        .from("bucket-no-autorizado")
        .upload(ruta, archivo, { upsert: false }),
    ]);

    expect(rutaInvalida.error).not.toBeNull();
    expect(bucketInvalido.error).not.toBeNull();
    await expect(inspeccionar(servidor!)).resolves.toMatchObject({ cantidad: 0 });
  });

  it("rechaza metodos inesperados", async () => {
    const respuesta = await fetch(
      `${servidor!.url}/storage/v1/object/${BUCKET_STORAGE_E2E}/${ruta}`,
      {
        method: "PUT",
        headers: encabezadosAutorizados(servidor!),
      },
    );

    expect(respuesta.status).toBe(405);
  });

  it("rechaza el inicio fuera del entorno E2E autorizado sin ocupar el puerto", async () => {
    const puerto = servidor!.puerto;
    await servidor!.detener();
    servidor = undefined;
    process.env.GITHUB_ACTIONS = "false";

    await expect(iniciarStorageHttpE2e({ puerto })).rejects.toThrow();

    process.env.GITHUB_ACTIONS = "true";
    servidor = await iniciarStorageHttpE2e({ puerto });
    await expect(inspeccionar(servidor)).resolves.toMatchObject({ cantidad: 0 });
  });

  it("libera el puerto y descarta los objetos al detenerse", async () => {
    const puerto = servidor!.puerto;
    const storage = clienteStorage(servidor!).from(BUCKET_STORAGE_E2E);
    await storage.upload(ruta, new Blob([png], { type: "image/png" }), {
      upsert: false,
    });

    await servidor!.detener();
    servidor = undefined;

    await expect(fetch(`http://127.0.0.1:${puerto}/__e2e/storage/objetos`)).rejects.toThrow();

    servidor = await iniciarStorageHttpE2e({ puerto });
    await expect(inspeccionar(servidor)).resolves.toEqual({
      cantidad: 0,
      objetos: [],
    });
  });

  it("espera una solicitud activa antes de cerrar y limpia despues", async () => {
    const boundary = "luqgarage-storage-e2e-boundary";
    const inicio = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="cacheControl"\r\n\r\n3600\r\n--${boundary}\r\nContent-Disposition: form-data; name=""; filename="prueba.png"\r\nContent-Type: image/png\r\n\r\n`,
    );
    const final = Buffer.from(`\r\n--${boundary}--\r\n`);
    let resolverRespuesta: (() => void) | undefined;
    const respuestaRecibida = new Promise<void>((resolver) => {
      resolverRespuesta = resolver;
    });
    const solicitud = request(
      `${servidor!.url}/storage/v1/object/${BUCKET_STORAGE_E2E}/${ruta}`,
      {
        method: "POST",
        headers: {
          ...encabezadosAutorizados(servidor!),
          connection: "close",
          "content-type": `multipart/form-data; boundary=${boundary}`,
          "x-upsert": "false",
        },
      },
      (respuesta) => {
        respuesta.resume();
        respuesta.on("end", () => resolverRespuesta?.());
      },
    );
    solicitud.write(inicio);
    solicitud.write(png);
    await new Promise((resolver) => setTimeout(resolver, 20));

    let cierreResuelto = false;
    const cierre = servidor!.detener().then(() => {
      cierreResuelto = true;
    });
    await new Promise((resolver) => setTimeout(resolver, 20));
    expect(cierreResuelto).toBe(false);

    solicitud.end(final);
    await respuestaRecibida;
    await cierre;

    const puerto = servidor!.puerto;
    servidor = await iniciarStorageHttpE2e({ puerto });
    await expect(inspeccionar(servidor)).resolves.toEqual({
      cantidad: 0,
      objetos: [],
    });
  });

  it("permite llamadas repetidas a detener", async () => {
    const primera = servidor!.detener();
    const segunda = servidor!.detener();

    await expect(Promise.all([primera, segunda])).resolves.toEqual([
      undefined,
      undefined,
    ]);
    await expect(servidor!.detener()).resolves.toBeUndefined();
  });

  it("bloquea operaciones tras un error de cierre y permite reintentar", async () => {
    const cerrar = vi.spyOn(Server.prototype, "close").mockImplementationOnce(
      function cierreFallido(this: Server, callback) {
        queueMicrotask(() => callback?.(new Error("Fallo de cierre simulado.")));
        return this;
      },
    );

    await expect(servidor!.detener()).rejects.toThrow("Fallo de cierre simulado");

    const respuestaBloqueada = await fetch(`${servidor!.url}/__e2e/storage/objetos`, {
      headers: encabezadosAutorizados(servidor!),
    });
    expect(respuestaBloqueada.status).toBe(503);

    cerrar.mockRestore();
    await expect(servidor!.detener()).resolves.toBeUndefined();

    const puerto = servidor!.puerto;
    servidor = await iniciarStorageHttpE2e({ puerto });
    await expect(inspeccionar(servidor)).resolves.toMatchObject({ cantidad: 0 });
  });
});
