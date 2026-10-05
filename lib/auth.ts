import type { RolUsuario } from "@prisma/client";

import { auth } from "@/auth";
import { obtenerUsuarioParaAutorizacionPorId } from "@/lib/db/usuario";

export class ErrorAutenticacion extends Error {
  constructor() {
    super("Autenticación requerida.");
    this.name = "ErrorAutenticacion";
  }
}

export class ErrorAutorizacion extends Error {
  constructor() {
    super("No autorizado.");
    this.name = "ErrorAutorizacion";
  }
}

export type UsuarioAutenticado = {
  id: string;
  rol: RolUsuario;
};

export async function requerirUsuario(): Promise<UsuarioAutenticado> {
  const sesion = await auth();
  const usuarioId = sesion?.user?.usuarioId;

  if (typeof usuarioId !== "string" || usuarioId.length === 0) {
    throw new ErrorAutenticacion();
  }

  const usuario = await obtenerUsuarioParaAutorizacionPorId(usuarioId);

  if (!usuario || !usuario.activo) {
    throw new ErrorAutenticacion();
  }

  return {
    id: usuario.id,
    rol: usuario.rol,
  };
}

export async function requerirRol(
  rolesPermitidos: readonly RolUsuario[],
): Promise<UsuarioAutenticado> {
  const usuario = await requerirUsuario();

  if (!rolesPermitidos.includes(usuario.rol)) {
    throw new ErrorAutorizacion();
  }

  return usuario;
}
