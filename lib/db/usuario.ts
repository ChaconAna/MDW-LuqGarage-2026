import { Prisma } from "@prisma/client";

import { prisma } from "./client";

const seleccionUsuarioParaAutenticacion = {
  id: true,
  googleSub: true,
  activo: true,
} satisfies Prisma.UsuarioSelect;

const seleccionUsuarioParaSesion = {
  id: true,
  rol: true,
  activo: true,
} satisfies Prisma.UsuarioSelect;

type DatosInicioSesionGoogle = {
  googleSub: string;
  email: string;
};

export async function autorizarInicioSesionGoogle({
  googleSub,
  email,
}: DatosInicioSesionGoogle) {
  const emailNormalizado = email.toLowerCase();

  const usuarioVinculado = await prisma.usuario.findUnique({
    where: { googleSub },
    select: seleccionUsuarioParaAutenticacion,
  });

  if (usuarioVinculado) {
    return usuarioVinculado.activo;
  }

  const usuarioPreautorizado = await prisma.usuario.findUnique({
    where: { email: emailNormalizado },
    select: seleccionUsuarioParaAutenticacion,
  });

  if (!usuarioPreautorizado) {
    await prisma.usuario.create({
      data: {
        email: emailNormalizado,
        googleSub,
        rol: "MECANICO",
        activo: true,
      },
    });

    return true;
  }

  if (!usuarioPreautorizado.activo || usuarioPreautorizado.googleSub !== null) {
    return false;
  }

  try {
    const vinculacion = await prisma.usuario.updateMany({
      where: {
        id: usuarioPreautorizado.id,
        googleSub: null,
        activo: true,
      },
      data: { googleSub },
    });

    return vinculacion.count === 1;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return false;
    }

    throw error;
  }
}

export function obtenerUsuarioParaSesionPorGoogleSub(googleSub: string) {
  return prisma.usuario.findUnique({
    where: { googleSub },
    select: seleccionUsuarioParaSesion,
  });
}

export function obtenerUsuarioParaAutorizacionPorId(id: string) {
  return prisma.usuario.findUnique({
    where: { id },
    select: seleccionUsuarioParaSesion,
  });
}
