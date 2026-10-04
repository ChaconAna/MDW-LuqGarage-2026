import { z } from "zod";

export const parametrosSiniestroSchema = z.object({
  id: z.string().uuid(),
});

export type ParametrosSiniestro = z.infer<typeof parametrosSiniestroSchema>;

export const listadoSiniestrosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
