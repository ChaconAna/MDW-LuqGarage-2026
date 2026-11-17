import { z } from "zod";

import { crearVehiculoSchema } from "./vehiculo";

// Entrada del globalSetup existente; solo se consumen los catálogos necesarios.
export const manifiestoConcurrenciaVehiculoE2eSchema = z.object({
  ejecucionId: z.string().uuid(),
  modelo: z.object({ id: crearVehiculoSchema.shape.modeloId }),
  tipoVehiculo: z.object({ id: crearVehiculoSchema.shape.tipoVehiculoId }),
});

export const csrfConcurrenciaVehiculoE2eSchema = z.object({
  csrfToken: z.string().min(1),
});
