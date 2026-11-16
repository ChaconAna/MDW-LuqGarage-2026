"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ErrorAutenticacion,
  ErrorAutorizacion,
  requerirRol,
} from "@/lib/auth";
import { crearCliente } from "@/lib/db/cliente";
import { listarLocalidades } from "@/lib/db/localidad";
import {
  crearClienteSchema,
  type DatosCreacionCliente,
} from "@/lib/schemas/cliente";
import { catalogoLocalidadesQuerySchema } from "@/lib/schemas/localidad";

export type EstadoFormularioCliente = {
  errores: Partial<Record<keyof DatosCreacionCliente, string>>;
  errorGeneral?: string;
};

export type PaginaLocalidadesFormulario = Awaited<
  ReturnType<typeof listarLocalidades>
> & {
  pagina: number;
  busqueda: string;
};

function errorAcceso(error: unknown, operacion: "guardar" | "consultar") {
  if (error instanceof ErrorAutenticacion) {
    return "Tu sesión no está disponible. Volvé a iniciar sesión.";
  }

  if (error instanceof ErrorAutorizacion) {
    return operacion === "guardar"
      ? "No tenés permisos para crear clientes."
      : "No tenés permisos para consultar Localidades.";
  }

  return undefined;
}

function erroresValidacionCliente(
  resultado: Exclude<
    ReturnType<typeof crearClienteSchema.safeParse>,
    { success: true }
  >,
): EstadoFormularioCliente {
  const errores: EstadoFormularioCliente["errores"] = {};

  for (const problema of resultado.error.issues) {
    const campo = problema.path[0];

    if (
      typeof campo === "string" &&
      campo in crearClienteSchema.shape &&
      errores[campo as keyof DatosCreacionCliente] === undefined
    ) {
      errores[campo as keyof DatosCreacionCliente] = problema.message;
    }
  }

  return {
    errores,
    errorGeneral: "No pudimos guardar el cliente. Revisá los campos indicados.",
  };
}

export async function crearClienteAction(
  _estadoAnterior: EstadoFormularioCliente,
  entrada: unknown,
): Promise<EstadoFormularioCliente> {
  let clienteId: string;

  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

    const resultadoDatos = crearClienteSchema.safeParse(entrada);

    if (!resultadoDatos.success) {
      return erroresValidacionCliente(resultadoDatos);
    }

    const resultadoCreacion = await crearCliente(resultadoDatos.data);

    if (!resultadoCreacion.creado) {
      if (resultadoCreacion.motivo === "DNI_DUPLICADO") {
        const mensaje = "Ya existe un Cliente con el DNI indicado.";
        return { errores: { dni: mensaje }, errorGeneral: mensaje };
      }

      const mensaje =
        "La Localidad seleccionada ya no está disponible. Elegí otra opción.";
      return {
        errores: { localidadId: mensaje },
        errorGeneral: mensaje,
      };
    }

    clienteId = resultadoCreacion.cliente.id;
  } catch (error: unknown) {
    const mensajeAcceso = errorAcceso(error, "guardar");
    if (mensajeAcceso) return { errores: {}, errorGeneral: mensajeAcceso };

    console.error("Falló inesperadamente el alta de un Cliente.");
    return {
      errores: {},
      errorGeneral:
        "No pudimos confirmar el alta. Revisá el listado antes de volver a intentarlo.",
    };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
  redirect(`/clientes/${clienteId}`);
}

export async function consultarLocalidadesAction(entrada: unknown) {
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

    const resultadoQuery = catalogoLocalidadesQuerySchema.safeParse(entrada);
    if (!resultadoQuery.success) {
      return {
        ok: false,
        error: "Los parámetros de búsqueda de Localidades no son válidos.",
      } as const;
    }

    const { page, limit, busqueda } = resultadoQuery.data;
    let datos = await listarLocalidades(page, limit, busqueda);
    const pagina = Math.min(
      page,
      Math.max(1, Math.ceil(datos.total / limit)),
    );

    if (pagina !== page) {
      datos = await listarLocalidades(pagina, limit, busqueda);
    }

    return { ok: true, ...datos, pagina, busqueda } as const;
  } catch (error: unknown) {
    const mensajeAcceso = errorAcceso(error, "consultar");
    if (mensajeAcceso) return { ok: false, error: mensajeAcceso } as const;

    console.error("Falló la consulta del catálogo de Localidades.");
    return {
      ok: false,
      error: "No pudimos cargar las Localidades. Intentá nuevamente.",
    } as const;
  }
}
