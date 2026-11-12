"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ErrorAutenticacion, ErrorAutorizacion, requerirRol } from "@/lib/auth";
import { crearOrdenTrabajo, agregarPresupuestosOrdenTrabajoPorId, actualizarObservacionesOrdenTrabajoPorId, finalizarOrdenTrabajoPorId } from "@/lib/db/ordenTrabajo";
import { listarPresupuestosAprobadosDisponibles } from "@/lib/db/presupuesto";
import { crearOrdenTrabajoSchema, listadoOrdenesTrabajoQuerySchema, parametrosOrdenTrabajoSchema, agregarPresupuestosOrdenTrabajoSchema, actualizarObservacionesOrdenTrabajoSchema } from "@/lib/schemas/ordenTrabajo";
import { serializarDetalleOrdenTrabajo } from "@/lib/services/ordenTrabajo";

export type EstadoCreacionOrdenTrabajo = {
  errorGeneral?: string;
  errorSeleccion?: string;
  errorObservaciones?: string;
  mensajeExito?: string;
  ordenTrabajo?: ReturnType<typeof serializarDetalleOrdenTrabajo>;
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

async function autorizarGestion(id: unknown) {
  await requerirRol(["ENCARGADO_DEL_TALLER"]);
  return parametrosOrdenTrabajoSchema.safeParse({ id });
}

function confirmarGestion(orden: Parameters<typeof serializarDetalleOrdenTrabajo>[0], mensajeExito: string): EstadoCreacionOrdenTrabajo {
  revalidatePath(`/ordenes-trabajo/${orden.id}`);
  revalidatePath("/ordenes-trabajo");
  revalidatePath(`/siniestros/${orden.siniestro.id}`);
  return { mensajeExito, ordenTrabajo: serializarDetalleOrdenTrabajo(orden) };
}

export async function incorporarPresupuestosOrdenTrabajoAction(id: unknown, entrada: unknown): Promise<EstadoCreacionOrdenTrabajo> {
  try {
    const parametro = await autorizarGestion(id);
    if (!parametro.success) return { errorGeneral: "La orden de trabajo indicada no es válida." };
    const datos = agregarPresupuestosOrdenTrabajoSchema.safeParse(entrada);
    if (!datos.success) return { errorGeneral: "Revisá la selección de presupuestos.", errorSeleccion: "Seleccioná al menos un presupuesto válido, sin repetirlo." };
    const resultado = await agregarPresupuestosOrdenTrabajoPorId(parametro.data.id, datos.data);
    if (!resultado.actualizada) {
      switch (resultado.motivo) {
        case "ORDEN_TRABAJO_NO_ENCONTRADA": return { errorGeneral: "La orden de trabajo ya no existe." };
        case "ORDEN_TRABAJO_NO_EDITABLE": return { errorGeneral: "La orden de trabajo ya no está en BORRADOR. Actualizá el detalle." };
        case "PRESUPUESTO_NO_ENCONTRADO": return { errorGeneral: "Uno o más presupuestos seleccionados ya no existen." };
        case "PRESUPUESTO_NO_APROBADO": return { errorGeneral: "Todos los presupuestos deben estar APROBADOS." };
        case "PRESUPUESTO_OTRO_SINIESTRO": return { errorGeneral: "Todos los presupuestos deben pertenecer al mismo siniestro de la orden." };
        case "PRESUPUESTO_YA_PERTENECE": return { errorGeneral: "Un presupuesto seleccionado ya pertenece a esta orden de trabajo." };
        case "PRESUPUESTO_YA_ASOCIADO": return { errorGeneral: "Un presupuesto seleccionado ya fue asociado a otra orden de trabajo." };
        default: { const inesperado: never = resultado; throw new Error(`Resultado inesperado: ${inesperado}`); }
      }
    }
    revalidatePath(`/siniestros/${resultado.ordenTrabajo.siniestro.id}/ordenes-trabajo/nueva`);
    for (const presupuestoId of datos.data.presupuestoIds) revalidatePath(`/presupuestos/${presupuestoId}`);
    return confirmarGestion(resultado.ordenTrabajo, "Los presupuestos se incorporaron a la orden de trabajo.");
  } catch (error: unknown) { return { errorGeneral: mensajeError(error) }; }
}

export async function guardarObservacionesOrdenTrabajoAction(id: unknown, entrada: unknown): Promise<EstadoCreacionOrdenTrabajo> {
  try {
    const parametro = await autorizarGestion(id);
    if (!parametro.success) return { errorGeneral: "La orden de trabajo indicada no es válida." };
    const datos = actualizarObservacionesOrdenTrabajoSchema.safeParse(entrada);
    if (!datos.success) return { errorGeneral: "Revisá las observaciones indicadas.", errorObservaciones: "Los sectores y sus observaciones no son válidos o están repetidos." };
    const resultado = await actualizarObservacionesOrdenTrabajoPorId(parametro.data.id, datos.data);
    if (!resultado.actualizada) {
      switch (resultado.motivo) {
        case "ORDEN_TRABAJO_NO_ENCONTRADA": return { errorGeneral: "La orden de trabajo ya no existe." };
        case "ORDEN_TRABAJO_NO_EDITABLE": return { errorGeneral: "La orden de trabajo ya no está en BORRADOR. Actualizá el detalle." };
        case "SECTOR_NO_ENCONTRADO": return { errorGeneral: "Uno o más sectores ya no existen.", errorObservaciones: "Revisá los sectores de la orden." };
        case "SECTOR_NO_PERTENECE": return { errorGeneral: "No se pueden modificar observaciones de sectores ajenos a esta orden.", errorObservaciones: "Revisá los sectores de la orden." };
        default: { const inesperado: never = resultado; throw new Error(`Resultado inesperado: ${inesperado}`); }
      }
    }
    return confirmarGestion(resultado.ordenTrabajo, "Las observaciones se guardaron.");
  } catch (error: unknown) { return { errorGeneral: mensajeError(error) }; }
}

export async function finalizarOrdenTrabajoAction(id: unknown): Promise<EstadoCreacionOrdenTrabajo> {
  try {
    const parametro = await autorizarGestion(id);
    if (!parametro.success) return { errorGeneral: "La orden de trabajo indicada no es válida." };
    const resultado = await finalizarOrdenTrabajoPorId(parametro.data.id);
    if (!resultado.finalizada) {
      switch (resultado.motivo) {
        case "ORDEN_TRABAJO_NO_ENCONTRADA": return { errorGeneral: "La orden de trabajo ya no existe." };
        case "ORDEN_TRABAJO_NO_EDITABLE": return { errorGeneral: "La orden de trabajo ya no está en BORRADOR. Actualizá el detalle." };
        case "ORDEN_TRABAJO_SIN_PRESUPUESTOS": return { errorGeneral: "La orden debe tener al menos un presupuesto aprobado para finalizar." };
        case "PRESUPUESTO_NO_APROBADO": return { errorGeneral: "La orden contiene presupuestos que no están APROBADOS." };
        case "REPARACIONES_SIN_SECTORIZAR": return { errorGeneral: "No se puede finalizar: hay reparaciones sin sectorizar." };
        default: { const inesperado: never = resultado; throw new Error(`Resultado inesperado: ${inesperado}`); }
      }
    }
    return confirmarGestion(resultado.ordenTrabajo, "La confección de la orden de trabajo quedó FINALIZADA.");
  } catch (error: unknown) { return { errorGeneral: mensajeError(error) }; }
}
