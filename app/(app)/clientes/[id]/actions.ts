"use server";

import { revalidatePath } from "next/cache";

import { ErrorAutenticacion, ErrorAutorizacion, requerirRol } from "@/lib/auth";
import { darDeBajaClientePorId, obtenerClientePorId } from "@/lib/db/cliente";
import { bajaClienteSchema } from "@/lib/schemas/cliente";

export type EstadoBajaCliente = {
  mensajeExito?: string;
  errorGeneral?: string;
  inactivo?: true;
};

export async function darDeBajaClienteAction(entrada: unknown): Promise<EstadoBajaCliente> {
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

    const datos = bajaClienteSchema.safeParse(entrada);
    if (!datos.success) {
      return { errorGeneral: "El identificador o la confirmación de baja no son válidos." };
    }

    const { id } = datos.data;
    const realizada = await darDeBajaClientePorId(id, { soloSiActivo: true });
    if (!realizada) {
      const cliente = await obtenerClientePorId(id);
      if (!cliente) return { errorGeneral: "Cliente no encontrado." };
      revalidatePath("/clientes");
      revalidatePath(`/clientes/${id}`);
      return { errorGeneral: "El cliente ya está dado de baja.", inactivo: true };
    }

    revalidatePath("/clientes");
    revalidatePath(`/clientes/${id}`);
    revalidatePath(`/clientes/${id}/editar`);
    revalidatePath("/siniestros/nuevo");
    return {
      inactivo: true,
      mensajeExito: "Cliente dado de baja. Sus datos e historial se conservan; ya no puede utilizarse en nuevas operaciones.",
    };
  } catch (error: unknown) {
    if (error instanceof ErrorAutenticacion) {
      return { errorGeneral: "Tu sesión no está disponible. Volvé a iniciar sesión." };
    }
    if (error instanceof ErrorAutorizacion) {
      return { errorGeneral: "No tenés permisos para dar de baja clientes." };
    }
    console.error("Falló inesperadamente la baja de un Cliente.");
    return { errorGeneral: "No pudimos confirmar la baja. Actualizá el detalle antes de volver a intentarlo." };
  }
}
