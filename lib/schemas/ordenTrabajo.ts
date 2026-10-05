import { z } from "zod";

export const parametrosOrdenTrabajoSchema = z.object({
  id: z.string().uuid(),
});

export type ParametrosOrdenTrabajo = z.infer<
  typeof parametrosOrdenTrabajoSchema
>;

export const listadoOrdenesTrabajoQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
