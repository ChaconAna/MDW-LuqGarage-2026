import { z } from "zod";

import { crearVehiculoSchema, listadoVehiculosQuerySchema } from "./vehiculo";

export const altaVehiculoSchema = crearVehiculoSchema.extend({
  patente: crearVehiculoSchema.shape.patente.refine(
    (patente) => patente.trim().length > 0,
    "Ingresá la patente.",
  ),
  marcaId: z.string().uuid("Seleccioná una Marca válida."),
});
export type DatosAltaVehiculo = z.infer<typeof altaVehiculoSchema>;

export const catalogoVehiculoQuerySchema = z.discriminatedUnion("tipo", [
  listadoVehiculosQuerySchema.extend({ tipo: z.literal("marcas") }).strict(),
  listadoVehiculosQuerySchema.extend({ tipo: z.literal("tipos") }).strict(),
  listadoVehiculosQuerySchema.extend({
    tipo: z.literal("modelos"),
    marcaId: altaVehiculoSchema.shape.marcaId,
  }).strict(),
]);
export type ConsultaCatalogoVehiculo = z.infer<typeof catalogoVehiculoQuerySchema>;
