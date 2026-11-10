"use server";

import { TipoDocumentoSiniestro } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ErrorAutenticacion, ErrorAutorizacion, requerirRol } from "@/lib/auth";
import { registroSiniestroFormularioSchema } from "@/lib/schemas/registroSiniestroFormulario";
import {
  LIMITE_ENVIO_SINIESTRO_BYTES,
  MENSAJE_LIMITE_SINIESTRO,
  medirEnvioRegistroSiniestro,
  type CampoErrorRegistroSiniestro,
  type EstadoRegistroSiniestro,
} from "@/lib/services/registroSiniestroFormulario";
import { esFechaSiniestroValida, registrarSiniestroConDocumentos } from "@/lib/services/siniestro";
import { convertirFormDataSiniestro } from "@/lib/services/siniestroMultipart";

const mensajesValidacion = {
  numeroSiniestro: "Ingresá el número de siniestro.",
  fechaSiniestro: "Ingresá una fecha calendario válida.",
  gradoDano: "Seleccioná un grado de daño válido.",
  numeroPoliza: "Ingresá el número de póliza.",
  clienteId: "Seleccioná un cliente activo válido.",
  vehiculoId: "Seleccioná un vehículo activo válido.",
  aseguradoraId: "Seleccioná una aseguradora activa válida.",
  documentos: "Adjuntá exactamente una fotografía por cada una de las seis categorías obligatorias.",
} as const;

function esCampoError(campo: unknown): campo is CampoErrorRegistroSiniestro {
  return typeof campo === "string" && [
    ...Object.keys(mensajesValidacion),
    ...Object.values(TipoDocumentoSiniestro),
  ].includes(campo);
}

export async function registrarSiniestroAction(
  _estadoAnterior: EstadoRegistroSiniestro,
  formData: FormData,
): Promise<EstadoRegistroSiniestro> {
  let idCreado: string;
  try {
    await requerirRol(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);

    if (await medirEnvioRegistroSiniestro(formData) > LIMITE_ENVIO_SINIESTRO_BYTES) {
      return { errores: {}, errorGeneral: MENSAJE_LIMITE_SINIESTRO };
    }

    const resultado = registroSiniestroFormularioSchema.safeParse(
      convertirFormDataSiniestro(formData),
    );
    if (!resultado.success) {
      const errores: EstadoRegistroSiniestro["errores"] = {};
      for (const problema of resultado.error.issues) {
        const campo = problema.path[0];
        if (esCampoError(campo)) {
          errores[campo] ??= campo in mensajesValidacion
            ? mensajesValidacion[campo as keyof typeof mensajesValidacion]
            : problema.message;
        }
      }
      return {
        errores,
        errorGeneral: "No pudimos registrar el siniestro. Revisá los datos y la documentación.",
      };
    }

    const fechaRegistro = new Date();
    if (!esFechaSiniestroValida(resultado.data.fechaSiniestro, fechaRegistro)) {
      return { errores: {
        fechaSiniestro: "La fecha del siniestro no puede ser posterior a la fecha de registro.",
      } };
    }

    const registro = await registrarSiniestroConDocumentos(resultado.data, fechaRegistro);
    if (!registro.creado) {
      switch (registro.motivo) {
        case "NUMERO_DUPLICADO":
          return { errores: { numeroSiniestro: "Ya existe un siniestro con ese número." } };
        case "CLIENTE_NO_ENCONTRADO":
        case "CLIENTE_INACTIVO":
          return { errores: { clienteId: "El cliente ya no está disponible. Elegí un cliente activo." } };
        case "VEHICULO_NO_ENCONTRADO":
        case "VEHICULO_INACTIVO":
          return { errores: { vehiculoId: "El vehículo ya no está disponible. Elegí un vehículo activo." } };
        case "ASEGURADORA_NO_ENCONTRADA":
        case "ASEGURADORA_INACTIVA":
          return { errores: { aseguradoraId: "La aseguradora ya no está disponible. Elegí una aseguradora activa." } };
        case "ALMACENAMIENTO_FALLIDO":
          return { errores: {}, errorGeneral: "No fue posible almacenar la documentación. El siniestro no se registró." };
      }
    }
    idCreado = registro.siniestro.id;
  } catch (error: unknown) {
    if (error instanceof ErrorAutenticacion) {
      return { errores: {}, errorGeneral: "Tu sesión no está disponible. Volvé a iniciar sesión." };
    }
    if (error instanceof ErrorAutorizacion) {
      return { errores: {}, errorGeneral: "No tenés permisos para registrar siniestros." };
    }
    console.error("Falló inesperadamente el registro de un siniestro desde el formulario.");
    return { errores: {}, errorGeneral: "No pudimos confirmar el registro. Revisá el listado antes de volver a enviarlo." };
  }

  revalidatePath("/siniestros");
  redirect(`/siniestros/${idCreado}`);
}
