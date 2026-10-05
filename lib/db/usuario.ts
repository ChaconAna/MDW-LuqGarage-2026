import { Prisma } from "@prisma/client";

import { prisma } from "./client";

const seleccionUsuarioParaAutenticacion = {
  id: true,
  googleSub: true,
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
  const usuarioVinculado = await prisma.usuario.findUnique({
    where: { googleSub },
    select: seleccionUsuarioParaAutenticacion,
  });

  if (usuarioVinculado) {
    return usuarioVinculado.activo;
  }

  const usuarioPreautorizado = await prisma.usuario.findUnique({
    where: { email },
    select: seleccionUsuarioParaAutenticacion,
  });

  if (
    !usuarioPreautorizado ||
    !usuarioPreautorizado.activo ||
    usuarioPreautorizado.googleSub !== null
  ) {
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
