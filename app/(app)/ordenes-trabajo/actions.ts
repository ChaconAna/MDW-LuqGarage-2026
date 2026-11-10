"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ErrorAutenticacion, ErrorAutorizacion, requerirRol } from "@/lib/auth";
import { crearOrdenTrabajo } from "@/lib/db/ordenTrabajo";
import { listarPresupuestosAprobadosDisponibles } from "@/lib/db/presupuesto";
import { crearOrdenTrabajoSchema, listadoOrdenesTrabajoQuerySchema, parametrosOrdenTrabajoSchema } from "@/lib/schemas/ordenTrabajo";

export type EstadoCreacionOrdenTrabajo = {
  errorGeneral?: string;
  errorSeleccion?: string;
};

function mensajeError(error: unknown, lectura = false) {
  if (error instanceof ErrorAutenticacion) return "Tu sesión no está disponible. Volvé a iniciar sesión.";
  if (error instanceof ErrorAutorizacion) return "No tenés permisos para gestionar órdenes de trabajo.";
  console.error("Falló una operación del formulario de órdenes de trabajo.");
  return lectura ? "No pudimos cargar los presupuestos. Intentá nuevamente."
    : "No pudimos confirmar el guardado. Revisá las órdenes del siniestro antes de volver a intentarlo.";
}

export async function crearOrdenTrabajoAction(
  siniestroId: string,
  _anterior: EstadoCreacionOrdenTrabajo,
  presupuestoIds: unknown,
): Promise<EstadoCreacionOrdenTrabajo> {
  let id: string;
  let presupuestos: string[];
  try {
    await requerirRol(["ENCARGADO_DEL_TALLER"]);
    const datos = crearOrdenTrabajoSchema.safeParse({ siniestroId, presupuestoIds });
    if (!datos.success) return {
      errorGeneral: "Revisá los datos de la orden de trabajo.",
      errorSeleccion: datos.error.issues.some(({ path }) => path[0] === "presupuestoIds")
        ? "Seleccioná al menos un presupuesto válido, sin repetirlo." : undefined,
    };
    const resultado = await crearOrdenTrabajo(datos.data);
    if (!resultado.creada) {
      switch (resultado.motivo) {
        case "SINIESTRO_NO_ENCONTRADO": return { errorGeneral: "El siniestro ya no existe." };
        case "PRESUPUESTO_NO_ENCONTRADO": return { errorGeneral: "Uno o más presupuestos seleccionados ya no existen." };
        case "PRESUPUESTO_NO_APROBADO": return { errorGeneral: "Todos los presupuestos deben estar APROBADOS. Revisá la selección." };
        case "PRESUPUESTO_OTRO_SINIESTRO": return { errorGeneral: "Todos los presupuestos deben pertenecer a este siniestro." };
        case "PRESUPUESTO_YA_ASOCIADO": return { errorGeneral: "Otro registro ya asoció un presupuesto seleccionado a una orden de trabajo. Revisá la selección." };
        default: {
          const inesperado: never = resultado;
          throw new Error(`Resultado inesperado: ${inesperado}`);
        }
      }
    }
    id = resultado.ordenTrabajo.id;
    presupuestos = datos.data.presupuestoIds;
  } catch (error: unknown) {
    return { errorGeneral: mensajeError(error) };
  }
  revalidatePath("/ordenes-trabajo");
  revalidatePath(`/siniestros/${siniestroId}`);
  revalidatePath(`/siniestros/${siniestroId}/ordenes-trabajo/nueva`);
  for (const presupuestoId of presupuestos) revalidatePath(`/presupuestos/${presupuestoId}`);
  redirect(`/ordenes-trabajo/${id}`);
}

export async function consultarPresupuestosDisponiblesAction(siniestroId: string, page: unknown) {
  try {
    await requerirRol(["ENCARGADO_DEL_TALLER"]);
    const parametro = parametrosOrdenTrabajoSchema.safeParse({ id: siniestroId });
    const query = listadoOrdenesTrabajoQuerySchema.safeParse({ page, limit: 10 });
    if (!parametro.success || !query.success || Array.isArray(page)) return { ok: false, error: "Los parámetros del catálogo no son válidos." } as const;
    let datos = await listarPresupuestosAprobadosDisponibles(parametro.data.id, query.data.page, 10);
    const pagina = Math.min(query.data.page, Math.max(1, Math.ceil(datos.total / 10)));
    if (pagina !== query.data.page) datos = await listarPresupuestosAprobadosDisponibles(parametro.data.id, pagina, 10);
    return { ok: true, ...datos, pagina } as const;
  } catch (error: unknown) {
    return { ok: false, error: mensajeError(error, true) } as const;
  }
}
