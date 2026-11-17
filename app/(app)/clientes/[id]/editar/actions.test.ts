import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({
  ErrorAutenticacion: class extends Error {},
  ErrorAutorizacion: class extends Error {},
  requerirRol: vi.fn(),
  actualizar: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  ErrorAutenticacion: dependencias.ErrorAutenticacion,
  ErrorAutorizacion: dependencias.ErrorAutorizacion,
  requerirRol: dependencias.requerirRol,
}));
vi.mock("@/lib/db/cliente", () => ({ actualizarClientePorId: dependencias.actualizar }));
vi.mock("@/lib/schemas/cliente", async () => import("../../../../../lib/schemas/cliente"));
vi.mock("next/cache", () => ({ revalidatePath: dependencias.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: dependencias.redirect }));

import { actualizarClienteAction } from "./actions";

const id = "10000000-0000-4000-8000-000000000001";
const datos = {
  nombre: "Ana",
  apellido: "Pérez",
  dni: "30111222",
  telefono: "11 5555 0101",
  email: "ana@ejemplo.test",
  direccion: "Calle 123",
  localidadId: "20000000-0000-4000-8000-000000000002",
};
const redireccion = new Error("REDIRECCION");

beforeEach(() => {
  vi.resetAllMocks();
  dependencias.requerirRol.mockResolvedValue({ rol: "RECEPCIONISTA" });
  dependencias.actualizar.mockResolvedValue({ actualizado: true, cliente: { id, activo: false } });
  dependencias.redirect.mockImplementation(() => { throw redireccion; });
});

function sinNavegacion() {
  expect(dependencias.revalidatePath).not.toHaveBeenCalled();
  expect(dependencias.redirect).not.toHaveBeenCalled();
}

describe("actualizarClienteAction", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])(
    "autoriza a %s, guarda sin cambiar activo y redirige al detalle",
    async (rol) => {
      dependencias.requerirRol.mockResolvedValue({ rol });
      await expect(actualizarClienteAction(id, { errores: {} }, {
        ...datos, nombre: "  Ana  ",
      })).rejects.toBe(redireccion);
      expect(dependencias.requerirRol).toHaveBeenCalledWith(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"]);
      expect(dependencias.requerirRol.mock.invocationCallOrder[0]).toBeLessThan(
        dependencias.actualizar.mock.invocationCallOrder[0]!,
      );
      expect(dependencias.actualizar).toHaveBeenCalledExactlyOnceWith(id, datos);
      expect(dependencias.actualizar.mock.calls[0]?.[1]).not.toHaveProperty("activo");
      expect(dependencias.revalidatePath.mock.calls).toEqual([
        ["/clientes"], [`/clientes/${id}`], [`/clientes/${id}/editar`],
      ]);
      expect(dependencias.redirect).toHaveBeenCalledWith(`/clientes/${id}`);
    },
  );

  it.each(["MECANICO", "ADMINISTRADOR"])("rechaza a %s antes de persistir", async () => {
    dependencias.requerirRol.mockRejectedValue(new dependencias.ErrorAutorizacion());
    const resultado = await actualizarClienteAction(id, { errores: {} }, datos);
    expect(resultado.errorGeneral).toMatch(/permisos/);
    expect(dependencias.actualizar).not.toHaveBeenCalled();
    sinNavegacion();
  });

  it("rechaza una sesión ausente", async () => {
    dependencias.requerirRol.mockRejectedValue(new dependencias.ErrorAutenticacion());
    const resultado = await actualizarClienteAction(id, { errores: {} }, datos);
    expect(resultado.errorGeneral).toMatch(/sesión/);
    expect(dependencias.actualizar).not.toHaveBeenCalled();
    sinNavegacion();
  });

  it.each(["invalido", "", null, { id }])("rechaza el ID %j", async (idInvalido) => {
    const resultado = await actualizarClienteAction(idInvalido, { errores: {} }, datos);
    expect(resultado.errorGeneral).toMatch(/id/);
    expect(dependencias.actualizar).not.toHaveBeenCalled();
    sinNavegacion();
  });

  it("informa los campos inválidos sin guardar", async () => {
    const resultado = await actualizarClienteAction(id, { errores: {} }, {
      nombre: " ", apellido: "", dni: "", telefono: "", email: "", direccion: "", localidadId: "no-uuid",
    });
    expect(Object.keys(resultado.errores).sort()).toEqual(Object.keys(datos).sort());
    expect(dependencias.actualizar).not.toHaveBeenCalled();
    sinNavegacion();
  });

  it.each([{}, null, { ...datos, activo: true }, { ...datos, activo: false }, { ...datos, provinciaId: id }])(
    "rechaza entradas vacías o campos ajenos a la edición: %j", async (entrada) => {
      expect((await actualizarClienteAction(id, { errores: {} }, entrada)).errorGeneral).toBeTruthy();
      expect(dependencias.actualizar).not.toHaveBeenCalled();
      sinNavegacion();
    },
  );

  it.each([
    ["DNI_DUPLICADO", "dni", /Ya existe/],
    ["LOCALIDAD_NO_ENCONTRADA", "localidadId", /Localidad/],
    ["CLIENTE_NO_ENCONTRADO", undefined, /Cliente no encontrado/],
  ] as const)("maneja %s sin redirigir", async (motivo, campo, mensaje) => {
    dependencias.actualizar.mockResolvedValue({ actualizado: false, motivo });
    const resultado = await actualizarClienteAction(id, { errores: {} }, datos);
    expect(resultado.errorGeneral).toMatch(mensaje);
    if (campo) expect(resultado.errores[campo]).toMatch(mensaje);
    sinNavegacion();
  });

  it("oculta detalles técnicos de errores inesperados y no reintenta", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      dependencias.actualizar.mockRejectedValue(new Error("secreto-simulado"));
      const resultado = await actualizarClienteAction(id, { errores: {} }, datos);
      expect(resultado.errorGeneral).toMatch(/No pudimos confirmar/);
      expect(JSON.stringify([resultado, log.mock.calls])).not.toContain("secreto-simulado");
      expect(dependencias.actualizar).toHaveBeenCalledOnce();
      sinNavegacion();
    } finally {
      log.mockRestore();
    }
  });
});
