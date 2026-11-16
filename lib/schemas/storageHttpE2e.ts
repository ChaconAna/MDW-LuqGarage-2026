import { z } from "zod";

export const rutaObjetoStorageE2eSchema = z
  .string()
  .min(1)
  .max(1024)
  .refine(
    (ruta) => {
      const segmentos = ruta.split("/");

      return (
        segmentos[0] === "siniestros" &&
        segmentos.length >= 3 &&
        segmentos.every(
          (segmento) =>
            segmento.length > 0 &&
            segmento !== "." &&
            segmento !== ".." &&
            !segmento.includes("\\") &&
            !segmento.includes("\0"),
        )
      );
    },
    "La ruta del objeto no esta autorizada para el Storage E2E.",
  );

export const cuerpoEliminacionStorageE2eSchema = z.object({
  prefixes: z.array(rutaObjetoStorageE2eSchema).min(1).max(20),
});

export const archivoStorageE2eSchema = z
  .instanceof(Blob)
  .refine((archivo) => archivo.size > 0, "El archivo no puede estar vacio.")
  .refine(
    (archivo) => archivo.type.startsWith("image/"),
    "El archivo debe ser una imagen.",
  );
