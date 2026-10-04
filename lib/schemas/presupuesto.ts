import { z } from "zod";

export const parametrosPresupuestoSchema = z.object({
  id: z.string().uuid(),
});

export type ParametrosPresupuesto = z.infer<
  typeof parametrosPresupuestoSchema
>;

export const listadoPresupuestosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
