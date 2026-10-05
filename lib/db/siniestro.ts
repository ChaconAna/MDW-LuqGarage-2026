import { Prisma } from "@prisma/client";
import type { EstadoSiniestro, GradoDano } from "@prisma/client";

import type { DatosCreacionSiniestro } from "../schemas/siniestro";
import type { ClienteTransaccion } from "./transaccion";

import { prisma } from "./client";
import { ejecutarTransaccion } from "./transaccion";

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

export async function crearSiniestro(
  datos: DatosCreacionSiniestro,
  fechaRegistro: Date,
) {
  try {
    return await ejecutarTransaccion(async (cliente) => {
      const [clienteExistente, vehiculo, aseguradora] = await Promise.all([
        cliente.cliente.findUnique({
          where: { id: datos.clienteId },
          select: { activo: true },
        }),
        cliente.vehiculo.findUnique({
          where: { id: datos.vehiculoId },
          select: { activo: true },
        }),
        cliente.aseguradora.findUnique({
          where: { id: datos.aseguradoraId },
          select: { activo: true },
        }),
      ]);

      if (!clienteExistente) {
        return {
          creado: false,
          motivo: "CLIENTE_NO_ENCONTRADO",
        } as const;
      }

      if (!vehiculo) {
        return {
          creado: false,
          motivo: "VEHICULO_NO_ENCONTRADO",
        } as const;
      }

      if (!aseguradora) {
        return {
          creado: false,
          motivo: "ASEGURADORA_NO_ENCONTRADA",
        } as const;
      }

      if (!clienteExistente.activo) {
        return { creado: false, motivo: "CLIENTE_INACTIVO" } as const;
      }

      if (!vehiculo.activo) {
        return { creado: false, motivo: "VEHICULO_INACTIVO" } as const;
      }

      if (!aseguradora.activo) {
        return { creado: false, motivo: "ASEGURADORA_INACTIVA" } as const;
      }

      const { documentos, ...datosSiniestro } = datos;
      const siniestro = await cliente.siniestro.create({
        data: {
          ...datosSiniestro,
          fechaRegistro,
          estado: "REGISTRADO",
          documentos: {
            create: documentos,
          },
        },
        select: seleccionDetalleSiniestro,
      });

      return { creado: true, siniestro } as const;
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { creado: false, motivo: "NUMERO_DUPLICADO" } as const;
    }

    throw error;
  }
}
