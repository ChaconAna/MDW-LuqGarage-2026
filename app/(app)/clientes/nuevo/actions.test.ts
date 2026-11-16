import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({
  ErrorAutenticacion: class extends Error {},
  ErrorAutorizacion: class extends Error {},
  requerirRol: vi.fn(),
  crear: vi.fn(),
  listarLocalidades: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  ErrorAutenticacion: dependencias.ErrorAutenticacion,
  ErrorAutorizacion: dependencias.ErrorAutorizacion,
  requerirRol: dependencias.requerirRol,
}));
vi.mock("@/lib/db/cliente", () => ({ crearCliente: dependencias.crear }));
vi.mock("@/lib/db/localidad", () => ({
  listarLocalidades: dependencias.listarLocalidades,
}));
vi.mock("@/lib/schemas/cliente", async () =>
  import("../../../../lib/schemas/cliente"),
);
vi.mock("@/lib/schemas/localidad", async () =>
  import("../../../../lib/schemas/localidad"),
);
vi.mock("next/cache", () => ({
  revalidatePath: dependencias.revalidatePath,
}));
vi.mock("next/navigation", () => ({ redirect: dependencias.redirect }));

import { consultarLocalidadesAction, crearClienteAction } from "./actions";

const clienteId = "10000000-0000-4000-8000-000000000001";
const localidadId = "20000000-0000-4000-8000-000000000002";
const estadoInicial = { errores: {} };
const redireccion = new Error("REDIRECCION_SIMULADA");

function datosValidos() {
  return {
    nombre: "Ana",
    apellido: "Pérez",
    dni: "30111222",
    telefono: "11 5555 0101",
    email: "ana@ejemplo.test",
    direccion: "Calle 123",
    localidadId,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  dependencias.requerirRol.mockResolvedValue({
    id: "usuario",
    rol: "RECEPCIONISTA",
  });
  dependencias.crear.mockResolvedValue({
    creado: true,
    cliente: { id: clienteId },
  });
  dependencias.listarLocalidades.mockResolvedValue({
    localidades: [
      {
        id: localidadId,
        nombre: "San Martín",
        provincia: { id: "provincia-1", nombre: "Buenos Aires" },
      },
    ],
    total: 11,
  });
  dependencias.redirect.mockImplementation(() => {
    throw redireccion;
  });
});

function sinEscritura() {
  expect(dependencias.crear).not.toHaveBeenCalled();
  expect(dependencias.revalidatePath).not.toHaveBeenCalled();
  expect(dependencias.redirect).not.toHaveBeenCalled();
}

describe("crearClienteAction", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])(
    "crea, revalida y redirige para %s",
    async (rol) => {
      dependencias.requerirRol.mockResolvedValue({ id: "usuario", rol });
      const entrada = {
        ...datosValidos(),
        nombre: "  Ana  ",
        direccion: "  Calle 123  ",
      };

      await expect(
        crearClienteAction(estadoInicial, entrada),
      ).rejects.toBe(redireccion);

      expect(dependencias.requerirRol).toHaveBeenCalledWith([
        "RECEPCIONISTA",
        "ENCARGADO_DEL_TALLER",
      ]);
      expect(dependencias.crear).toHaveBeenCalledExactlyOnceWith({
        ...datosValidos(),
        nombre: "Ana",
        direccion: "Calle 123",
      });
      expect(dependencias.revalidatePath.mock.calls).toEqual([
        ["/clientes"],
        [`/clientes/${clienteId}`],
      ]);
      expect(dependencias.redirect).toHaveBeenCalledWith(
        `/clientes/${clienteId}`,
      );
      expect(dependencias.requerirRol.mock.invocationCallOrder[0]).toBeLessThan(
        dependencias.crear.mock.invocationCallOrder[0]!,
      );
    },
  );

  it("rechaza todos los campos obligatorios vacíos", async () => {
    const resultado = await crearClienteAction(estadoInicial, {
      nombre: " ",
      apellido: "",
      dni: " ",
      telefono: "",
      email: " ",
      direccion: "",
      localidadId: "",
    });

    expect(Object.keys(resultado.errores).sort()).toEqual(
      [
        "apellido",
        "direccion",
        "dni",
        "email",
        "localidadId",
        "nombre",
        "telefono",
      ].sort(),
    );
    expect(resultado.errorGeneral).toMatch(/Revisá los campos/);
    sinEscritura();
  });

  it("rechaza campos externos sin persistir", async () => {
    const resultado = await crearClienteAction(estadoInicial, {
      ...datosValidos(),
      activo: false,
      provinciaId: "provincia-arbitraria",
    });

    expect(resultado.errorGeneral).toBeTruthy();
    sinEscritura();
  });

  it("muestra el DNI duplicado junto al campo", async () => {
    dependencias.crear.mockResolvedValue({
      creado: false,
      motivo: "DNI_DUPLICADO",
    });

    const resultado = await crearClienteAction(estadoInicial, datosValidos());

    expect(resultado.errores.dni).toMatch(/Ya existe/);
    expect(resultado.errorGeneral).toBe(resultado.errores.dni);
    expect(dependencias.redirect).not.toHaveBeenCalled();
  });

  it("informa una Localidad inexistente sin redirigir", async () => {
    dependencias.crear.mockResolvedValue({
      creado: false,
      motivo: "LOCALIDAD_NO_ENCONTRADA",
    });

    const resultado = await crearClienteAction(estadoInicial, datosValidos());

    expect(resultado.errores.localidadId).toMatch(/Localidad/);
    expect(dependencias.redirect).not.toHaveBeenCalled();
  });

  it.each([
    [new dependencias.ErrorAutenticacion(), /sesión/],
    [new dependencias.ErrorAutorizacion(), /permisos/],
  ])("rechaza acceso antes de persistir", async (error, mensaje) => {
    dependencias.requerirRol.mockRejectedValue(error);

    const resultado = await crearClienteAction(estadoInicial, datosValidos());

    expect(resultado.errorGeneral).toMatch(mensaje);
    sinEscritura();
  });

  it("no expone una excepción inesperada ni reintenta", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    dependencias.crear.mockRejectedValue(new Error("secreto-simulado"));

    const resultado = await crearClienteAction(estadoInicial, datosValidos());

    expect(resultado.errorGeneral).toMatch(/No pudimos confirmar/);
    expect(JSON.stringify([resultado, log.mock.calls])).not.toContain(
      "secreto-simulado",
    );
    expect(dependencias.crear).toHaveBeenCalledOnce();
    expect(dependencias.redirect).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("consultarLocalidadesAction", () => {
  it("busca y pagina Localidades con su Provincia", async () => {
    const resultado = await consultarLocalidadesAction({
      page: 2,
      limit: 10,
      busqueda: "  buenos aires  ",
    });

    expect(resultado).toMatchObject({
      ok: true,
      pagina: 2,
      busqueda: "buenos aires",
      total: 11,
    });
    expect(dependencias.listarLocalidades).toHaveBeenCalledExactlyOnceWith(
      2,
      10,
      "buenos aires",
    );
    expect(dependencias.crear).not.toHaveBeenCalled();
  });

  it("corrige una página superior a la última disponible", async () => {
    await consultarLocalidadesAction({ page: 99, limit: 10, busqueda: "" });

    expect(dependencias.listarLocalidades.mock.calls).toEqual([
      [99, 10, ""],
      [2, 10, ""],
    ]);
  });

  it.each([0, -1, "inválida", ["1", "2"], 1.5])(
    "rechaza la página inválida %j",
    async (page) => {
      const resultado = await consultarLocalidadesAction({
        page,
        limit: 10,
        busqueda: "",
      });

      expect(resultado.ok).toBe(false);
      expect(dependencias.listarLocalidades).not.toHaveBeenCalled();
    },
  );

  it("autoriza antes de consultar", async () => {
    dependencias.requerirRol.mockRejectedValue(
      new dependencias.ErrorAutorizacion(),
    );

    const resultado = await consultarLocalidadesAction({
      page: 1,
      limit: 10,
      busqueda: "",
    });

    expect(resultado).toMatchObject({ ok: false, error: expect.any(String) });
    expect(dependencias.listarLocalidades).not.toHaveBeenCalled();
  });
});
