import type { ZodError } from "zod";
import type { listarReparaciones } from "../db/reparacion";

export type PaginaCatalogoPresupuesto = Awaited<ReturnType<typeof listarReparaciones>>;
export type OpcionCatalogoPresupuesto = PaginaCatalogoPresupuesto["opciones"][number];

export type EstadoFormularioPresupuesto = {
  errores: Record<string, string>;
  errorGeneral?: string;
};

export function erroresValidacionPresupuesto(error: ZodError): EstadoFormularioPresupuesto {
  const errores: Record<string, string> = {};
  for (const problema of error.issues) {
    const campo = problema.path.join(".");
    const ultimo = problema.path.at(-1);
    const mensaje = problema.code === "custom" ? problema.message
      : ultimo === "numeroPresupuesto" ? "Ingresá el número de presupuesto."
      : ultimo === "costo" ? "Ingresá un costo no negativo con punto y dos decimales (por ejemplo, 0.00)."
      : ultimo === "cantidad" ? "Ingresá una cantidad entera entre 1 y 2147483647."
      : ultimo === "reparaciones" ? "Agregá al menos una reparación."
      : ultimo === "reparacionId" ? "Seleccioná una reparación válida."
      : ultimo === "repuestoId" ? "Seleccioná un repuesto válido."
      : "Los datos indicados no son válidos o contienen campos no permitidos.";
    errores[campo] ??= mensaje;
  }
  return { errores, errorGeneral: "No pudimos guardar el presupuesto. Revisá los campos indicados." };
}
