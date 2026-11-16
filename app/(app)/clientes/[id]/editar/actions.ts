"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ErrorAutenticacion, ErrorAutorizacion, requerirRol } from "@/lib/auth";
import { actualizarClientePorId } from "@/lib/db/cliente";
import {
  actualizarClienteSchema,
  crearClienteSchema,
  parametrosClienteSchema,
  type DatosActualizacionCliente,
} from "@/lib/schemas/cliente";
import type { EstadoFormularioCliente } from "../../nuevo/actions";

export async function actualizarClienteAction(
  id: unknown,
  _estadoAnterior: EstadoFormularioCliente,
  entrada: unknown,
): Promise<EstadoFormularioCliente> {
  let clienteId: string;

  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

    const parametros = parametrosClienteSchema.safeParse({ id });
    if (!parametros.success) {
      return { errores: {}, errorGeneral: "El id del cliente no es válido." };
    }

    const datos = actualizarClienteSchema.safeParse(entrada);
    if (!datos.success) {
      const errores: EstadoFormularioCliente["errores"] = {};
      for (const problema of datos.error.issues) {
        const campo = problema.path[0];
        if (typeof campo === "string" && Object.hasOwn(crearClienteSchema.shape, campo)) {
          const clave = campo as keyof DatosActualizacionCliente;
          errores[clave] ??= problema.message;
        }
      }
      return {
        errores,
        errorGeneral: "No pudimos guardar los cambios. Revisá los datos ingresados.",
      };
    }

    const resultado = await actualizarClientePorId(parametros.data.id, datos.data);
    if (!resultado.actualizado) {
      if (resultado.motivo === "CLIENTE_NO_ENCONTRADO") {
        return { errores: {}, errorGeneral: "Cliente no encontrado." };
      }
      if (resultado.motivo === "DNI_DUPLICADO") {
        const mensaje = "Ya existe un Cliente con el DNI indicado.";
        return { errores: { dni: mensaje }, errorGeneral: mensaje };
      }
      const mensaje = "La Localidad seleccionada ya no está disponible. Elegí otra opción.";
      return { errores: { localidadId: mensaje }, errorGeneral: mensaje };
    }
    clienteId = parametros.data.id;
  } catch (error: unknown) {
    if (error instanceof ErrorAutenticacion) {
      return { errores: {}, errorGeneral: "Tu sesión no está disponible. Volvé a iniciar sesión." };
    }
    if (error instanceof ErrorAutorizacion) {
      return { errores: {}, errorGeneral: "No tenés permisos para editar clientes." };
    }
    console.error("Falló inesperadamente la edición de un Cliente.");
    return {
      errores: {},
      errorGeneral: "No pudimos confirmar los cambios. Revisá el detalle antes de volver a intentarlo.",
    };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath(`/clientes/${clienteId}/editar`);
  redirect(`/clientes/${clienteId}`);
}
