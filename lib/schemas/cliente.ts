import { z } from "zod";

export const parametrosClienteSchema = z.object({
  id: z.string().uuid(),
});

export type ParametrosCliente = z.infer<typeof parametrosClienteSchema>;

export const listadoClientesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
