"use server";

import { revalidatePath } from "next/cache";

import { ErrorAutenticacion, ErrorAutorizacion, requerirRol } from "@/lib/auth";
import { darDeBajaVehiculoPorId, obtenerVehiculoPorId } from "@/lib/db/vehiculo";
import { bajaVehiculoSchema } from "@/lib/schemas/vehiculo";

export type EstadoBajaVehiculo = {
  mensajeExito?: string;
  errorGeneral?: string;
  inactivo?: true;
};

export async function darDeBajaVehiculoAction(entrada: unknown): Promise<EstadoBajaVehiculo> {
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

    const datos = bajaVehiculoSchema.safeParse(entrada);
    if (!datos.success) {
      return { errorGeneral: "El identificador o la confirmación de baja no son válidos." };
    }

    const { id } = datos.data;
    const realizada = await darDeBajaVehiculoPorId(id, { soloSiActivo: true });
    if (!realizada) {
      const vehiculo = await obtenerVehiculoPorId(id);
      if (!vehiculo) return { errorGeneral: "Vehículo no encontrado." };
      revalidatePath("/vehiculos");
      revalidatePath(`/vehiculos/${id}`);
      return { errorGeneral: "El vehículo ya está dado de baja.", inactivo: true };
    }

    revalidatePath("/vehiculos");
    revalidatePath(`/vehiculos/${id}`);
    revalidatePath(`/vehiculos/${id}/editar`);
    revalidatePath("/siniestros/nuevo");
    return {
      inactivo: true,
      mensajeExito: "Vehículo dado de baja. Sus datos e historial se conservan; ya no puede utilizarse en nuevas operaciones.",
    };
  } catch (error: unknown) {
    if (error instanceof ErrorAutenticacion) {
      return { errorGeneral: "Tu sesión no está disponible. Volvé a iniciar sesión." };
    }
    if (error instanceof ErrorAutorizacion) {
      return { errorGeneral: "No tenés permisos para dar de baja vehículos." };
    }
    console.error("Falló inesperadamente la baja de un Vehículo.");
    return { errorGeneral: "No pudimos confirmar la baja. Actualizá el detalle antes de volver a intentarlo." };
  }
}
