import { z } from "zod";

export const parametrosClienteSchema = z.object({
  id: z.string().uuid(),
});

export type ParametrosCliente = z.infer<typeof parametrosClienteSchema>;
