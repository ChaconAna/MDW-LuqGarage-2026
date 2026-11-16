import { z } from "zod";

import { listadoClientesQuerySchema } from "./cliente";

export const catalogoLocalidadesQuerySchema = listadoClientesQuerySchema
  .extend({
    busqueda: z.string().trim().max(100).default(""),
  })
  .strict();

export type CatalogoLocalidadesQuery = z.infer<
  typeof catalogoLocalidadesQuerySchema
>;
