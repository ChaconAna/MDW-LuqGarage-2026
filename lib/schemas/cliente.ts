import { z } from "zod";

export const parametrosClienteSchema = z.object({
  id: z.string().uuid(),
});

export type ParametrosCliente = z.infer<typeof parametrosClienteSchema>;

export const listadoClientesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const crearClienteSchema = z
  .object({
    nombre: z.string(),
    apellido: z.string(),
    dni: z.string(),
    telefono: z.string(),
    email: z.string(),
    direccion: z.string(),
    localidadId: z.string().uuid(),
  })
  .strict();

export type DatosCreacionCliente = z.infer<typeof crearClienteSchema>;

export const actualizarClienteSchema = crearClienteSchema.partial().refine(
  (datos) => Object.keys(datos).length > 0,
  { message: "Debe indicar al menos un campo para actualizar." },
);

export type DatosActualizacionCliente = z.infer<
  typeof actualizarClienteSchema
>;
