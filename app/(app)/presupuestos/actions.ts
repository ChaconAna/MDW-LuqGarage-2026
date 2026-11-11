"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ErrorAutenticacion, ErrorAutorizacion, requerirRol } from "@/lib/auth";
import {
  crearPresupuesto,
  actualizarPresupuestoPorId,
  enviarPresupuestoPorId,
  aprobarPresupuestoPorId,
  rechazarPresupuestoPorId,
  type DetallePresupuesto,
} from "@/lib/db/presupuesto";
import { listarReparaciones } from "@/lib/db/reparacion";
import { listarRepuestos } from "@/lib/db/repuesto";
import { catalogoPresupuestoQuerySchema } from "@/lib/schemas/catalogoPresupuesto";
import { crearPresupuestoSchema, actualizarPresupuestoSchema, parametrosPresupuestoSchema } from "@/lib/schemas/presupuesto";
import { erroresValidacionPresupuesto, type EstadoFormularioPresupuesto } from "@/lib/services/presupuestoFormulario";

function errorServidor(
  error: unknown,
  mensajeInesperado = "No pudimos confirmar el guardado. Revisá los presupuestos del siniestro antes de volver a intentarlo.",
): EstadoFormularioPresupuesto {
  const mensaje = error instanceof ErrorAutenticacion ? "Tu sesión no está disponible. Volvé a iniciar sesión."
    : error instanceof ErrorAutorizacion ? "No tenés permisos para gestionar presupuestos."
    : mensajeInesperado;
  if (!(error instanceof ErrorAutenticacion) && !(error instanceof ErrorAutorizacion)) {
    console.error("Falló una operación del formulario de presupuestos.");
  }
  return { errores: {}, errorGeneral: mensaje };
}

export async function crearPresupuestoAction(
  siniestroIdDeRuta: string,
  _anterior: EstadoFormularioPresupuesto,
  entrada: unknown,
): Promise<EstadoFormularioPresupuesto> {
  let id: string;
  let siniestroId: string;
  try {
    await requerirRol(["ENCARGADO_DEL_TALLER"]);
    const campos = typeof entrada === "object" && entrada !== null ? entrada : {};
    const datos = crearPresupuestoSchema.safeParse({ ...campos, siniestroId: siniestroIdDeRuta });
    if (!datos.success) return erroresValidacionPresupuesto(datos.error);
    const resultado = await crearPresupuesto(datos.data);
    if (!resultado.creado) {
      switch (resultado.motivo) {
        case "NUMERO_DUPLICADO": return { errores: { numeroPresupuesto: "Ya existe un presupuesto con ese número." }, errorGeneral: "Ya existe un presupuesto con ese número." };
        case "SINIESTRO_NO_ENCONTRADO": return { errores: {}, errorGeneral: "El siniestro no existe. No se guardó el presupuesto." };
        case "REPARACION_NO_ENCONTRADA": return { errores: { reparaciones: "Revisá las reparaciones seleccionadas." }, errorGeneral: "Una o más reparaciones seleccionadas ya no existen." };
        case "REPUESTO_NO_ENCONTRADO": return { errores: { repuestos: "Revisá los repuestos seleccionados." }, errorGeneral: "Uno o más repuestos seleccionados ya no existen." };
      }
    }
    id = resultado.presupuesto.id;
    siniestroId = resultado.presupuesto.siniestro.id;
  } catch (error: unknown) {
    return errorServidor(error);
  }
  revalidatePath("/siniestros");
  revalidatePath(`/siniestros/${siniestroId}`);
  redirect(`/presupuestos/${id}`);
}

export async function actualizarPresupuestoAction(
  id: string,
  _anterior: EstadoFormularioPresupuesto,
  entrada: unknown,
): Promise<EstadoFormularioPresupuesto> {
  let siniestroId: string;
  try {
    await requerirRol(["ENCARGADO_DEL_TALLER"]);
    const parametro = parametrosPresupuestoSchema.safeParse({ id });
    if (!parametro.success) return { errores: {}, errorGeneral: "El presupuesto indicado no es válido." };
    const datos = actualizarPresupuestoSchema.safeParse(entrada);
    if (!datos.success) return erroresValidacionPresupuesto(datos.error);
    const resultado = await actualizarPresupuestoPorId(parametro.data.id, datos.data);
    if (!resultado.actualizado) {
      switch (resultado.motivo) {
        case "PRESUPUESTO_NO_ENCONTRADO": return { errores: {}, errorGeneral: "El presupuesto ya no existe." };
        case "PRESUPUESTO_NO_EDITABLE": return { errores: {}, errorGeneral: "El presupuesto ya no está en BORRADOR y no puede modificarse." };
        case "REPARACION_NO_ENCONTRADA": return { errores: { reparaciones: "Revisá las reparaciones seleccionadas." }, errorGeneral: "Una o más reparaciones seleccionadas ya no existen." };
        case "REPUESTO_NO_ENCONTRADO": return { errores: { repuestos: "Revisá los repuestos seleccionados." }, errorGeneral: "Uno o más repuestos seleccionados ya no existen." };
      }
    }
    siniestroId = resultado.presupuesto.siniestro.id;
  } catch (error: unknown) {
    return errorServidor(error);
  }
  revalidatePath(`/siniestros/${siniestroId}`);
  revalidatePath(`/presupuestos/${id}`);
  revalidatePath(`/presupuestos/${id}/editar`);
  redirect(`/presupuestos/${id}`);
}

export async function consultarCatalogoPresupuestoAction(entrada: unknown) {
  try {
    await requerirRol(["ENCARGADO_DEL_TALLER"]);
    const query = catalogoPresupuestoQuerySchema.safeParse(entrada);
    if (!query.success) return { ok: false, error: "Los parámetros del catálogo no son válidos." } as const;
    const { tipo, page, limit } = query.data;
    const listar = tipo === "reparaciones" ? listarReparaciones : listarRepuestos;
    let datos = await listar(page, limit);
    const pagina = Math.min(page, Math.max(1, Math.ceil(datos.total / limit)));
    if (pagina !== page) datos = await listar(pagina, limit);
    return { ok: true, ...datos, pagina } as const;
  } catch (error: unknown) {
    return { ok: false, error: errorServidor(error, "No pudimos cargar el catálogo. Intentá nuevamente.").errorGeneral! } as const;
  }
}

export type EstadoTransicionPresupuesto = {
  errorGeneral?: string;
  mensajeExito?: string;
};

async function autorizarTransicionPresupuesto(id: unknown) {
  await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
  const parametro = parametrosPresupuestoSchema.safeParse({ id });
  if (!parametro.success) return { valido: false } as const;
  return { valido: true, id: parametro.data.id } as const;
}

function revalidarTransicionPresupuesto(presupuesto: Pick<DetallePresupuesto, "id" | "siniestro">) {
  revalidatePath(`/presupuestos/${presupuesto.id}`);
  revalidatePath(`/presupuestos/${presupuesto.id}/editar`);
  revalidatePath(`/siniestros/${presupuesto.siniestro.id}`);
}

function errorTransicionPresupuesto(error: unknown): EstadoTransicionPresupuesto {
  return {
    errorGeneral: errorServidor(error, "No pudimos confirmar el registro del estado. Actualizá el detalle antes de volver a intentarlo.").errorGeneral,
  };
}

export async function registrarEnvioPresupuestoAction(
  id: unknown,
): Promise<EstadoTransicionPresupuesto> {
  try {
    const parametro = await autorizarTransicionPresupuesto(id);
    if (!parametro.valido) return { errorGeneral: "El presupuesto indicado no es válido." };
    const resultado = await enviarPresupuestoPorId(parametro.id);
    if (!resultado.enviado) {
      switch (resultado.motivo) {
        case "PRESUPUESTO_NO_ENCONTRADO": return { errorGeneral: "El presupuesto ya no existe." };
        case "PRESUPUESTO_NO_ENVIABLE": return { errorGeneral: "El presupuesto ya no está en BORRADOR. Actualizá el detalle para consultar su estado." };
      }
    }
    revalidarTransicionPresupuesto(resultado.presupuesto);
    return { mensajeExito: "El envío externo del presupuesto quedó registrado." };
  } catch (error: unknown) {
    return errorTransicionPresupuesto(error);
  }
}

export async function registrarAprobacionPresupuestoAction(
  id: unknown,
): Promise<EstadoTransicionPresupuesto> {
  try {
    const parametro = await autorizarTransicionPresupuesto(id);
    if (!parametro.valido) return { errorGeneral: "El presupuesto indicado no es válido." };
    const resultado = await aprobarPresupuestoPorId(parametro.id);
    if (!resultado.aprobado) {
      switch (resultado.motivo) {
        case "PRESUPUESTO_NO_ENCONTRADO": return { errorGeneral: "El presupuesto ya no existe." };
        case "PRESUPUESTO_NO_APROBABLE": return { errorGeneral: "El presupuesto ya no está en ENVIADO. Actualizá el detalle para consultar su estado." };
      }
    }
    revalidarTransicionPresupuesto(resultado.presupuesto);
    return { mensajeExito: "La respuesta externa de aprobación quedó registrada." };
  } catch (error: unknown) {
    return errorTransicionPresupuesto(error);
  }
}

export async function registrarRechazoPresupuestoAction(
  id: unknown,
): Promise<EstadoTransicionPresupuesto> {
  try {
    const parametro = await autorizarTransicionPresupuesto(id);
    if (!parametro.valido) return { errorGeneral: "El presupuesto indicado no es válido." };
    const resultado = await rechazarPresupuestoPorId(parametro.id);
    if (!resultado.rechazado) {
      switch (resultado.motivo) {
        case "PRESUPUESTO_NO_ENCONTRADO": return { errorGeneral: "El presupuesto ya no existe." };
        case "PRESUPUESTO_NO_RECHAZABLE": return { errorGeneral: "El presupuesto ya no está en ENVIADO. Actualizá el detalle para consultar su estado." };
      }
    }
    revalidarTransicionPresupuesto(resultado.presupuesto);
    return { mensajeExito: "La respuesta externa de rechazo quedó registrada." };
  } catch (error: unknown) {
    return errorTransicionPresupuesto(error);
  }
}
