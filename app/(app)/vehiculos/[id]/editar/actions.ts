"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ErrorAutenticacion, ErrorAutorizacion, requerirRol } from "@/lib/auth";
import { obtenerModeloPorId } from "@/lib/db/modelo";
import { actualizarVehiculoPorId } from "@/lib/db/vehiculo";
import { altaVehiculoSchema, type DatosAltaVehiculo } from "@/lib/schemas/altaVehiculo";

import type { EstadoFormularioVehiculo } from "../../nuevo/actions";
import { parametrosVehiculoSchema, actualizarVehiculoSchema } from "@/lib/schemas/vehiculo";

function errorAcceso(error: unknown) {
  if (error instanceof ErrorAutenticacion) return "Tu sesión no está disponible. Volvé a iniciar sesión.";
  if (error instanceof ErrorAutorizacion) return "No tenés permisos para editar vehículos.";
}

export async function actualizarVehiculoAction(
  id: unknown,
  _anterior: EstadoFormularioVehiculo,
  entrada: unknown,
): Promise<EstadoFormularioVehiculo> {
  let vehiculoId: string;
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
    const parametros = parametrosVehiculoSchema.safeParse({ id });
    if (!parametros.success) return { errores: {}, errorGeneral: "El id del vehículo no es válido." };
    const datos = altaVehiculoSchema.safeParse(entrada);
    if (!datos.success) {
      const errores: EstadoFormularioVehiculo["errores"] = {};
      for (const problema of datos.error.issues) {
        const campo = problema.path[0];
        if (typeof campo === "string" && Object.hasOwn(altaVehiculoSchema.shape, campo)) {
          const clave = campo as keyof DatosAltaVehiculo;
          errores[clave] ??= clave === "modeloId" ? "Seleccioná un Modelo válido."
            : clave === "tipoVehiculoId" ? "Seleccioná un Tipo de vehículo válido." : problema.message;
        }
      }
      return { errores, errorGeneral: "No pudimos guardar el vehículo. Revisá los campos indicados." };
    }

    const { marcaId, ...vehiculo } = datos.data;
    const modelo = await obtenerModeloPorId(vehiculo.modeloId);
    if (!modelo) {
      const mensaje = "El Modelo seleccionado ya no está disponible. Elegí otra opción.";
      return { errores: { modeloId: mensaje }, errorGeneral: mensaje };
    }
    if (modelo.marcaId !== marcaId) {
      const mensaje = "El Modelo no pertenece a la Marca seleccionada. Revisá la selección.";
      return { errores: { modeloId: mensaje, marcaId: mensaje }, errorGeneral: mensaje };
    }

    const resultado = await actualizarVehiculoPorId(parametros.data.id, actualizarVehiculoSchema.parse(vehiculo));
    if (!resultado.actualizado) {
      if (resultado.motivo === "VEHICULO_NO_ENCONTRADO") {
        return { errores: {}, errorGeneral: "Vehículo no encontrado." };
      }
      if (resultado.motivo === "PATENTE_DUPLICADA") {
        const mensaje = "Ya existe un Vehículo con la patente indicada.";
        return { errores: { patente: mensaje }, errorGeneral: mensaje };
      }
      const mensaje = "El Modelo o el Tipo de vehículo ya no está disponible. Revisá las selecciones.";
      return { errores: { modeloId: mensaje, tipoVehiculoId: mensaje }, errorGeneral: mensaje };
    }
    vehiculoId = resultado.vehiculo.id;
  } catch (error: unknown) {
    const acceso = errorAcceso(error);
    if (acceso) return { errores: {}, errorGeneral: acceso };
    console.error("Falló inesperadamente la edición de un Vehículo.");
    return { errores: {}, errorGeneral: "No pudimos confirmar los cambios. Revisá el detalle antes de volver a intentarlo." };
  }
  revalidatePath("/vehiculos");
  revalidatePath(`/vehiculos/${vehiculoId}`);
  revalidatePath(`/vehiculos/${vehiculoId}/editar`);
  revalidatePath("/siniestros/nuevo");
  redirect(`/vehiculos/${vehiculoId}`);
}
