"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ErrorAutenticacion, ErrorAutorizacion, requerirRol } from "@/lib/auth";
import { listarMarcas } from "@/lib/db/marca";
import { listarModelosPorMarca, obtenerModeloPorId } from "@/lib/db/modelo";
import { listarTiposVehiculo } from "@/lib/db/tipoVehiculo";
import { crearVehiculo } from "@/lib/db/vehiculo";
import { altaVehiculoSchema, catalogoVehiculoQuerySchema, type DatosAltaVehiculo } from "@/lib/schemas/altaVehiculo";

export type EstadoFormularioVehiculo = {
  errores: Partial<Record<keyof DatosAltaVehiculo, string>>;
  errorGeneral?: string;
};
export type PaginaCatalogoVehiculo = Awaited<ReturnType<typeof listarMarcas>> & { pagina: number };

function errorAcceso(error: unknown) {
  if (error instanceof ErrorAutenticacion) return "Tu sesión no está disponible. Volvé a iniciar sesión.";
  if (error instanceof ErrorAutorizacion) return "No tenés permisos para registrar vehículos ni consultar sus catálogos.";
}

export async function crearVehiculoAction(
  _anterior: EstadoFormularioVehiculo,
  entrada: unknown,
): Promise<EstadoFormularioVehiculo> {
  let vehiculoId: string;
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
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

    const resultado = await crearVehiculo(vehiculo);
    if (!resultado.creado) {
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
    console.error("Falló inesperadamente el alta de un Vehículo.");
    return { errores: {}, errorGeneral: "No pudimos confirmar el alta. Revisá el listado antes de volver a intentarlo." };
  }
  revalidatePath("/vehiculos");
  revalidatePath(`/vehiculos/${vehiculoId}`);
  revalidatePath("/siniestros/nuevo");
  redirect(`/vehiculos/${vehiculoId}`);
}

export async function consultarCatalogoVehiculoAction(entrada: unknown) {
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
    const resultado = catalogoVehiculoQuerySchema.safeParse(entrada);
    if (!resultado.success) return { ok: false, error: "Los parámetros del catálogo no son válidos." } as const;
    const datos = resultado.data;
    const consultar = (pagina: number) => datos.tipo === "marcas"
      ? listarMarcas(pagina, datos.limit)
      : datos.tipo === "tipos" ? listarTiposVehiculo(pagina, datos.limit)
        : listarModelosPorMarca(datos.marcaId, pagina, datos.limit);
    let catalogo = await consultar(datos.page);
    const pagina = Math.min(datos.page, Math.max(1, Math.ceil(catalogo.total / datos.limit)));
    if (pagina !== datos.page) catalogo = await consultar(pagina);
    return { ok: true, ...catalogo, pagina } as const;
  } catch (error: unknown) {
    const acceso = errorAcceso(error);
    if (acceso) return { ok: false, error: acceso } as const;
    console.error("Falló la consulta de un catálogo de Vehículos.");
    return { ok: false, error: "No pudimos cargar las opciones. Intentá nuevamente." } as const;
  }
}
