import { prisma } from "./client";

const emailUsuarioE2e = "encargado.e2e@luqgarage.test";
const identidadUsuarioE2e = {
  email: emailUsuarioE2e,
  googleSub: null,
  rol: "ENCARGADO_DEL_TALLER" as const,
  activo: true,
};

export async function prepararUsuarioE2e(usuarioId: string) {
  const conflictos = await prisma.usuario.findMany({
    where: {
      OR: [{ id: usuarioId }, { email: emailUsuarioE2e }],
    },
    select: { id: true, email: true },
  });

  if (conflictos.length > 0) {
    throw new Error(
      "No se pudo preparar el Usuario E2E en la base aislada de pruebas.",
    );
  }

  await prisma.usuario.create({
    data: {
      id: usuarioId,
      ...identidadUsuarioE2e,
    },
  });

  return true;
}

export async function eliminarUsuarioE2e(
  usuarioId: string,
  usuarioCreado: boolean,
) {
  if (!usuarioCreado) return false;

  const candidatos = await prisma.usuario.findMany({
    where: {
      OR: [{ id: usuarioId }, { email: emailUsuarioE2e }],
    },
    select: {
      id: true,
      email: true,
      googleSub: true,
      rol: true,
      activo: true,
    },
  });

  if (candidatos.length === 0) return false;

  const [usuario] = candidatos;
  if (
    candidatos.length !== 1 ||
    usuario?.id !== usuarioId ||
    usuario.email !== identidadUsuarioE2e.email ||
    usuario.googleSub !== identidadUsuarioE2e.googleSub ||
    usuario.rol !== identidadUsuarioE2e.rol ||
    usuario.activo !== identidadUsuarioE2e.activo
  ) {
    throw new Error(
      "No se pudo limpiar el Usuario E2E porque su identidad cambió.",
    );
  }

  const resultado = await prisma.usuario.deleteMany({
    where: {
      id: usuarioId,
      ...identidadUsuarioE2e,
    },
  });

  if (resultado.count !== 1) {
    throw new Error(
      "No se pudo limpiar el Usuario E2E porque su identidad cambió.",
    );
  }

  return true;
}
