import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => {
  const modelo = () => ({
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  });
  const cliente = {
    provincia: modelo(),
    localidad: modelo(),
    cliente: modelo(),
    marca: modelo(),
    modelo: modelo(),
    tipoVehiculo: modelo(),
    vehiculo: modelo(),
    aseguradora: modelo(),
    sector: modelo(),
    reparacion: modelo(),
  };

  return {
    cliente,
    ejecutarTransaccion: vi.fn(),
    validarEntorno: vi.fn(),
  };
});

vi.mock("../schemas/entornoE2e", () => ({
  validarEntornoAutenticacionE2e: dependencias.validarEntorno,
}));

vi.mock("./transaccion", () => ({
  ejecutarTransaccion: dependencias.ejecutarTransaccion,
}));

import {
  eliminarFlujoPrincipalE2e,
  prepararFlujoPrincipalE2e,
  type ManifiestoFlujoPrincipalE2e,
} from "./flujoPrincipalE2e";

const usuarioId = "10000000-0000-4000-8000-000000000001";
const modelos = Object.values(dependencias.cliente);

type OperacionTransaccion = (
  cliente: typeof dependencias.cliente,
) => Promise<unknown>;

function configurarLecturaLimpieza(
  manifiesto: ManifiestoFlujoPrincipalE2e,
) {
  dependencias.cliente.provincia.findUnique.mockResolvedValue({
    ...manifiesto.provincia,
    _count: { localidades: 1 },
  });
  dependencias.cliente.localidad.findUnique.mockResolvedValue({
    ...manifiesto.localidad,
    _count: { clientes: 1 },
  });
  dependencias.cliente.cliente.findUnique.mockResolvedValue({
    ...manifiesto.cliente,
    _count: { siniestros: 0 },
  });
  dependencias.cliente.marca.findUnique.mockResolvedValue({
    ...manifiesto.marca,
    _count: { modelos: 1 },
  });
  dependencias.cliente.modelo.findUnique.mockResolvedValue({
    ...manifiesto.modelo,
    _count: { vehiculos: 1 },
  });
  dependencias.cliente.tipoVehiculo.findUnique.mockResolvedValue({
    ...manifiesto.tipoVehiculo,
    _count: { vehiculos: 1 },
  });
  dependencias.cliente.vehiculo.findUnique.mockResolvedValue({
    ...manifiesto.vehiculo,
    _count: { siniestros: 0 },
  });
  dependencias.cliente.aseguradora.findUnique.mockResolvedValue({
    ...manifiesto.aseguradora,
    _count: { siniestros: 0 },
  });
  dependencias.cliente.sector.findUnique.mockResolvedValue({
    ...manifiesto.sector,
    _count: { reparaciones: 1, ordenesTrabajoSectores: 0 },
  });
  dependencias.cliente.reparacion.findUnique.mockResolvedValue({
    ...manifiesto.reparacion,
    _count: { detallesPresupuesto: 0 },
  });
}

function esperarNingunaEliminacion() {
  for (const modelo of modelos) {
    expect(modelo.deleteMany).not.toHaveBeenCalled();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTENTICACION_E2E_USUARIO_ID", usuarioId);
  dependencias.validarEntorno.mockReturnValue(true);
  dependencias.ejecutarTransaccion.mockImplementation(
    async (operacion: OperacionTransaccion) => operacion(dependencias.cliente),
  );

  for (const modelo of modelos) {
    modelo.findFirst.mockResolvedValue(null);
    modelo.create.mockResolvedValue({});
    modelo.deleteMany.mockResolvedValue({ count: 1 });
  }
});

describe("fixture del flujo principal E2E", () => {
  it("crea los diez registros en orden de dependencias y devuelve su manifiesto", async () => {
    const orden: string[] = [];
    const nombres = [
      "provincia",
      "localidad",
      "cliente",
      "marca",
      "modelo",
      "tipoVehiculo",
      "vehiculo",
      "aseguradora",
      "sector",
      "reparacion",
    ] as const;
    for (const nombre of nombres) {
      dependencias.cliente[nombre].create.mockImplementation(async () => {
        orden.push(nombre);
        return {};
      });
    }

    const manifiesto = await prepararFlujoPrincipalE2e();

    expect(orden).toEqual(nombres);
    expect(manifiesto.ejecucionId).toBe(usuarioId);
    expect(manifiesto.localidad.provinciaId).toBe(manifiesto.provincia.id);
    expect(manifiesto.cliente.localidadId).toBe(manifiesto.localidad.id);
    expect(manifiesto.modelo.marcaId).toBe(manifiesto.marca.id);
    expect(manifiesto.vehiculo).toMatchObject({
      modeloId: manifiesto.modelo.id,
      tipoVehiculoId: manifiesto.tipoVehiculo.id,
      activo: true,
    });
    expect(manifiesto.reparacion.sectorId).toBe(manifiesto.sector.id);
    expect(manifiesto.sector.nombre).toBe("Reparación");
    expect(manifiesto.playwright.numeroSiniestro).toMatch(/^SIN-E2E-/);
    expect(dependencias.validarEntorno.mock.invocationCallOrder[0]).toBeLessThan(
      dependencias.ejecutarTransaccion.mock.invocationCallOrder[0]!,
    );
  });

  it("rechaza un conflicto por identificador antes de crear registros", async () => {
    dependencias.cliente.provincia.findFirst.mockResolvedValue({
      id: "registro-preexistente",
    });

    await expect(prepararFlujoPrincipalE2e()).rejects.toThrow(/conflicto/);

    for (const modelo of modelos) expect(modelo.create).not.toHaveBeenCalled();
  });

  it("protege registros preexistentes que coinciden con una clave natural", async () => {
    dependencias.cliente.sector.findFirst.mockResolvedValue({
      id: "sector-preexistente",
    });

    await expect(prepararFlujoPrincipalE2e()).rejects.toThrow(/conflicto/);

    for (const modelo of modelos) expect(modelo.create).not.toHaveBeenCalled();
    esperarNingunaEliminacion();
  });

  it("deja toda la escritura dentro de la transacción y no continúa tras un error", async () => {
    dependencias.cliente.modelo.create.mockRejectedValue(
      new Error("conexion-secreta-simulada"),
    );

    const resultado = prepararFlujoPrincipalE2e();

    await expect(resultado).rejects.toThrow(
      "No se pudieron preparar los datos del flujo principal E2E.",
    );
    await expect(resultado).rejects.not.toThrow(/conexion-secreta-simulada/);
    expect(dependencias.ejecutarTransaccion).toHaveBeenCalledOnce();
    expect(dependencias.cliente.tipoVehiculo.create).not.toHaveBeenCalled();
    expect(dependencias.cliente.reparacion.create).not.toHaveBeenCalled();
  });

  it("limpia únicamente las identidades verificadas en orden inverso", async () => {
    const manifiesto = await prepararFlujoPrincipalE2e();
    configurarLecturaLimpieza(manifiesto);
    const orden: string[] = [];
    const nombres = [
      "reparacion",
      "sector",
      "aseguradora",
      "vehiculo",
      "tipoVehiculo",
      "modelo",
      "marca",
      "cliente",
      "localidad",
      "provincia",
    ] as const;
    for (const nombre of nombres) {
      dependencias.cliente[nombre].deleteMany.mockImplementation(async () => {
        orden.push(nombre);
        return { count: 1 };
      });
    }

    await eliminarFlujoPrincipalE2e(manifiesto);

    expect(orden).toEqual(nombres);
    expect(dependencias.cliente.reparacion.deleteMany).toHaveBeenCalledWith({
      where: manifiesto.reparacion,
    });
    expect(dependencias.cliente.provincia.deleteMany).toHaveBeenCalledWith({
      where: manifiesto.provincia,
    });
  });

  it("rechaza la limpieza si cambió la identidad de un registro", async () => {
    const manifiesto = await prepararFlujoPrincipalE2e();
    configurarLecturaLimpieza(manifiesto);
    dependencias.cliente.cliente.findUnique.mockResolvedValue({
      ...manifiesto.cliente,
      email: "registro-ajeno@luqgarage.invalid",
      _count: { siniestros: 0 },
    });

    await expect(eliminarFlujoPrincipalE2e(manifiesto)).rejects.toThrow(
      /identidad cambio/,
    );
    esperarNingunaEliminacion();
  });

  it("rechaza la limpieza ante relaciones inesperadas", async () => {
    const manifiesto = await prepararFlujoPrincipalE2e();
    configurarLecturaLimpieza(manifiesto);
    dependencias.cliente.vehiculo.findUnique.mockResolvedValue({
      ...manifiesto.vehiculo,
      _count: { siniestros: 1 },
    });

    await expect(eliminarFlujoPrincipalE2e(manifiesto)).rejects.toThrow(
      /relaciones inesperadas/,
    );
    esperarNingunaEliminacion();
  });

  it("valida el entorno antes de iniciar una transacción", async () => {
    dependencias.validarEntorno.mockReturnValue(false);

    await expect(prepararFlujoPrincipalE2e()).rejects.toThrow(/no esta habilitado/);

    expect(dependencias.ejecutarTransaccion).not.toHaveBeenCalled();
  });
});
