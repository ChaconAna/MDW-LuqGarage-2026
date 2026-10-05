import { z } from "zod";

const costoReparacionSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,9})\.\d{2}$/);

const detalleReparacionSchema = z
  .object({
    reparacionId: z.string().uuid(),
    costo: costoReparacionSchema,
  })
  .strict();

const detalleRepuestoSchema = z
  .object({
    repuestoId: z.string().uuid(),
    cantidad: z.number().int().min(1).max(2_147_483_647),
  })
  .strict();

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

export const crearPresupuestoSchema = z
  .object({
    numeroPresupuesto: z.string().min(1),
    siniestroId: z.string().uuid(),
    reparaciones: z.array(detalleReparacionSchema).min(1),
    repuestos: z.array(detalleRepuestoSchema).default([]),
  })
  .strict()
  .superRefine((datos, contexto) => {
    const reparacionesVistas = new Set<string>();

    datos.reparaciones.forEach(({ reparacionId }, indice) => {
      if (reparacionesVistas.has(reparacionId)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reparaciones", indice, "reparacionId"],
          message: "La Reparación no puede repetirse en el Presupuesto.",
        });
      }

      reparacionesVistas.add(reparacionId);
    });

    const repuestosVistos = new Set<string>();

    datos.repuestos.forEach(({ repuestoId }, indice) => {
      if (repuestosVistos.has(repuestoId)) {
        contexto.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["repuestos", indice, "repuestoId"],
          message: "El Repuesto no puede repetirse en el Presupuesto.",
        });
      }

      repuestosVistos.add(repuestoId);
    });
  });

export type DatosCreacionPresupuesto = z.infer<
  typeof crearPresupuestoSchema
>;
