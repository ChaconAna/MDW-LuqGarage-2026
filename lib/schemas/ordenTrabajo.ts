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

const observacionSectorOrdenTrabajoSchema = z
  .object({
    sectorId: z.string().uuid(),
    observacion: z.string().nullable(),
  })
  .strict();

export const actualizarObservacionesOrdenTrabajoSchema = z
  .object({
    sectores: z.array(observacionSectorOrdenTrabajoSchema).min(1),
  })
  .strict()
  .superRefine(({ sectores }, contexto) => {
    const idsVistos = new Set<string>();

    sectores.forEach(({ sectorId }, indice) => {
      if (idsVistos.has(sectorId)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sectores", indice, "sectorId"],
          message: "El Sector no puede repetirse en la Orden de Trabajo.",
        });
      }

      idsVistos.add(sectorId);
    });
  });

export type DatosActualizacionObservacionesOrdenTrabajo = z.infer<
  typeof actualizarObservacionesOrdenTrabajoSchema
>;
