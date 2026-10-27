import "server-only";

import type { RolUsuario } from "@prisma/client";
import { redirect } from "next/navigation";

import {
  ErrorAutenticacion,
  ErrorAutorizacion,
  requerirRol,
  type UsuarioAutenticado,
} from "./auth";

export type ResultadoAutorizacionPagina =
  | { autorizado: true; usuario: UsuarioAutenticado }
  | { autorizado: false };

export async function autorizarPagina(
  rolesPermitidos: readonly RolUsuario[],
): Promise<ResultadoAutorizacionPagina> {
  try {
    const usuario = await requerirRol(rolesPermitidos);

    return { autorizado: true, usuario };
  } catch (error: unknown) {
    if (error instanceof ErrorAutenticacion) {
      redirect("/");
    }

    if (error instanceof ErrorAutorizacion) {
      return { autorizado: false };
    }

    throw error;
  }
}
