import { z } from "zod";

export const costoReparacionSchema = z
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

type ColeccionesPresupuesto = {
  reparaciones?: Array<{ reparacionId: string }>;
  repuestos?: Array<{ repuestoId: string }>;
};

function validarDetallesDuplicados(
  datos: ColeccionesPresupuesto,
  contexto: z.RefinementCtx,
) {
  const reparacionesVistas = new Set<string>();

  datos.reparaciones?.forEach(({ reparacionId }, indice) => {
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

  datos.repuestos?.forEach(({ repuestoId }, indice) => {
    if (repuestosVistos.has(repuestoId)) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["repuestos", indice, "repuestoId"],
        message: "El Repuesto no puede repetirse en el Presupuesto.",
      });
    }

    repuestosVistos.add(repuestoId);
  });
}

export const parametrosPresupuestoSchema = z.object({
  id: z.string().uuid(),
});

export type ParametrosPresupuesto = z.infer<
  typeof parametrosPresupuestoSchema
>;

const paginacionPresupuestosBaseSchema = z.object({
  page: z.coerce.number().int().positive().safe().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export function validarDesplazamientoPresupuestos(
  { page, limit }: z.infer<typeof paginacionPresupuestosBaseSchema>,
  contexto: z.RefinementCtx,
) {
  if (!Number.isSafeInteger((page - 1) * limit)) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["page"],
      message: "El desplazamiento de paginación excede el rango de enteros seguros.",
    });
  }
}

export const listadoPresupuestosQuerySchema = paginacionPresupuestosBaseSchema
  .superRefine(validarDesplazamientoPresupuestos);

export const crearPresupuestoSchema = z
  .object({
    numeroPresupuesto: z.string().min(1),
    siniestroId: z.string().uuid(),
    reparaciones: z.array(detalleReparacionSchema).min(1),
    repuestos: z.array(detalleRepuestoSchema).default([]),
  })
  .strict()
  .superRefine(validarDetallesDuplicados);

export type DatosCreacionPresupuesto = z.infer<
  typeof crearPresupuestoSchema
>;

export const actualizarPresupuestoSchema = z
  .object({
    reparaciones: z.array(detalleReparacionSchema).min(1).optional(),
    repuestos: z.array(detalleRepuestoSchema).optional(),
  })
  .strict()
  .refine(
    ({ reparaciones, repuestos }) =>
      reparaciones !== undefined || repuestos !== undefined,
    { message: "Debe indicarse al menos una colección para modificar." },
  )
  .superRefine(validarDetallesDuplicados);

export type DatosActualizacionPresupuesto = z.infer<
  typeof actualizarPresupuestoSchema
>;
