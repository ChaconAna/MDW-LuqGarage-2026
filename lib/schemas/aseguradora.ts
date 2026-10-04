import { z } from "zod";

export const parametrosAseguradoraSchema = z.object({
  id: z.string().uuid(),
});

export type ParametrosAseguradora = z.infer<
  typeof parametrosAseguradoraSchema
>;

export const listadoAseguradorasQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const crearAseguradoraSchema = z
  .object({
    nombre: z.string(),
    cuit: z.string(),
    telefono: z.string(),
    email: z.string(),
    direccion: z.string(),
  })
  .strict();

export type DatosCreacionAseguradora = z.infer<
  typeof crearAseguradoraSchema
>;

export const actualizarAseguradoraSchema = crearAseguradoraSchema
  .partial()
  .refine((datos) => Object.keys(datos).length > 0, {
    message: "Debe indicar al menos un campo para actualizar.",
  });

export type DatosActualizacionAseguradora = z.infer<
  typeof actualizarAseguradoraSchema
>;
