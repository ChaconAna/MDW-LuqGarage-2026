import { z } from "zod";

import { listadoPresupuestosQuerySchema, validarDesplazamientoPresupuestos } from "./presupuesto";

export const tipoCatalogoPresupuestoSchema = z.enum(["reparaciones", "repuestos"]);
export type TipoCatalogoPresupuesto = z.infer<typeof tipoCatalogoPresupuestoSchema>;

export const catalogoPresupuestoQuerySchema = listadoPresupuestosQuerySchema
  .innerType()
  .extend({ tipo: tipoCatalogoPresupuestoSchema })
  .strict()
  .superRefine(validarDesplazamientoPresupuestos);
