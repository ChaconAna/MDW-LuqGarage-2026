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

export const crearOrdenTrabajoSchema = z
  .object({
    siniestroId: z.string().uuid(),
    presupuestoIds: z.array(z.string().uuid()).min(1),
  })
  .strict()
  .superRefine(({ presupuestoIds }, contexto) => {
    const idsVistos = new Set<string>();

    presupuestoIds.forEach((presupuestoId, indice) => {
      if (idsVistos.has(presupuestoId)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["presupuestoIds", indice],
          message: "El Presupuesto no puede repetirse en la Orden de Trabajo.",
        });
      }

      idsVistos.add(presupuestoId);
    });
  });

export type DatosCreacionOrdenTrabajo = z.infer<
  typeof crearOrdenTrabajoSchema
>;
