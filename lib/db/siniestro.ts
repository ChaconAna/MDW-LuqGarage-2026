import type { EstadoSiniestro, GradoDano, Prisma } from "@prisma/client";

import type { ClienteTransaccion } from "./transaccion";

import { prisma } from "./client";

const seleccionSiniestro = {
  id: true,
  numeroSiniestro: true,
  fechaSiniestro: true,
  fechaRegistro: true,
  gradoDano: true,
  numeroPoliza: true,
  estado: true,
  cliente: {
    select: {
      id: true,
      nombre: true,
      apellido: true,
      dni: true,
      activo: true,
    },
  },
  vehiculo: {
    select: {
      id: true,
      patente: true,
      activo: true,
      modelo: {
        select: {
          id: true,
          nombre: true,
          marca: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      },
      tipoVehiculo: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
  aseguradora: {
    select: {
      id: true,
      nombre: true,
      cuit: true,
      activo: true,
    },
  },
} satisfies Prisma.SiniestroSelect;

const seleccionDetalleSiniestro = {
  ...seleccionSiniestro,
  documentos: {
    select: {
      id: true,
      tipo: true,
      referenciaArchivo: true,
    },
  },
} satisfies Prisma.SiniestroSelect;

type DatosSiniestro = {
  numeroSiniestro: string;
  fechaSiniestro: Date;
  fechaRegistro: Date;
  gradoDano: GradoDano;
  numeroPoliza: string;
  estado: EstadoSiniestro;
  clienteId: string;
  vehiculoId: string;
  aseguradoraId: string;
};

export function asegurarSiniestroPorNumero(
  cliente: ClienteTransaccion,
  datos: DatosSiniestro,
) {
  return cliente.siniestro.upsert({
    where: { numeroSiniestro: datos.numeroSiniestro },
    update: datos,
    create: datos,
  });
}

export async function listarSiniestros(page: number, limit: number) {
  const [siniestros, total] = await prisma.$transaction([
    prisma.siniestro.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: "asc" },
      select: seleccionSiniestro,
    }),
    prisma.siniestro.count(),
  ]);

  return { siniestros, total };
}

export function obtenerSiniestroPorId(id: string) {
  return prisma.siniestro.findUnique({
    where: { id },
    select: seleccionDetalleSiniestro,
  });
}
