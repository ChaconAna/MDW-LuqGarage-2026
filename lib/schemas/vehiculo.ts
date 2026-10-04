import { z } from "zod";

export const parametrosVehiculoSchema = z.object({
  id: z.string().uuid(),
});

export type ParametrosVehiculo = z.infer<typeof parametrosVehiculoSchema>;

export const listadoVehiculosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const crearVehiculoSchema = z
  .object({
    patente: z.string(),
    modeloId: z.string().uuid(),
    tipoVehiculoId: z.string().uuid(),
  })
  .strict();

export type DatosCreacionVehiculo = z.infer<typeof crearVehiculoSchema>;

export const actualizarVehiculoSchema = crearVehiculoSchema.partial().refine(
  (datos) => Object.keys(datos).length > 0,
  { message: "Debe indicar al menos un campo para actualizar." },
);

export type DatosActualizacionVehiculo = z.infer<
  typeof actualizarVehiculoSchema
>;
