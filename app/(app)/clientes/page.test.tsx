import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencias = vi.hoisted(() => ({
  autorizar: vi.fn(),
  auth: vi.fn(),
  listar: vi.fn(),
  obtener: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/components/layout/LogoLuqGarage", async () =>
  import("../../../components/layout/LogoLuqGarage"),
);
vi.mock("@/auth", () => ({
  auth: dependencias.auth,
  signOut: vi.fn(),
}));
vi.mock("@/lib/authPagina", () => ({
  autorizarPagina: dependencias.autorizar,
}));
vi.mock("@/lib/db/cliente", () => ({
  listarClientes: dependencias.listar,
  obtenerClientePorId: dependencias.obtener,
}));
vi.mock("@/lib/utils", () => ({ clasesEnlaceTexto: "enlace" }));
vi.mock("@/lib/schemas/cliente", async () =>
  import("../../../lib/schemas/cliente"),
);
vi.mock("next/navigation", () => ({
  redirect: dependencias.redirect,
  notFound: dependencias.notFound,
}));
vi.mock("next/link", () => ({
  default: ({
    children,
    prefetch,
    ...props
  }: React.ComponentProps<"a"> & { prefetch?: boolean }) => {
    void prefetch;
    return React.createElement("a", props, children);
  },
}));
vi.mock("@/components/layout/ContenedorPagina", () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", {}, children),
}));
vi.mock("@/components/clientes/TablaClientes", async () =>
  import("../../../components/clientes/TablaClientes"),
);
vi.mock("@/components/clientes/BajaCliente", async () =>
  import("../../../components/clientes/BajaCliente"),
);
vi.mock("@/app/(app)/clientes/[id]/actions", () => ({ darDeBajaClienteAction: vi.fn() }));
vi.mock("@/components/ui/button", () => ({
  Button: (props: React.ComponentProps<"button"> & {
    asChild?: boolean;
    variant?: string;
    size?: string;
  }) => {
    const { asChild, variant, size, children, ...buttonProps } = props;
    void variant;
    void size;

    return asChild
      ? React.createElement(React.Fragment, {}, children)
      : React.createElement("button", buttonProps, children);
  },
}));

import AppLayout from "../layout";
import ClienteDetalleError from "./[id]/error";
import LoadingClienteDetalle from "./[id]/loading";
import ClienteDetallePage from "./[id]/page";
import ClientesError from "./error";
import LoadingClientes from "./loading";
import ClientesPage from "./page";

const redireccion = new Error("redirect");
const noEncontrado = new Error("not found");
const clienteId = "10000000-0000-4000-8000-000000000001";

function cliente(indice: number, activo: boolean) {
  return {
    id: `cliente-${indice}`,
    nombre: `Nombre ${indice}`,
    apellido: `Apellido ${indice}`,
    dni: `DNI-${indice}`,
    telefono: `11-5555-${indice.toString().padStart(4, "0")}`,
    email: `cliente${indice}@ejemplo.test`,
    direccion: `Calle ${indice}`,
    activo,
    localidad: {
      id: `localidad-${indice}`,
      nombre: `Localidad ${indice}`,
      provincia: {
        id: `provincia-${indice}`,
        nombre: `Provincia ${indice}`,
      },
    },
  };
}

function autorizar(rol: string) {
  dependencias.autorizar.mockResolvedValue({
    autorizado: true,
    usuario: { id: "usuario", rol, activo: true },
  });
}

const html = renderToStaticMarkup;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("React", React);
  autorizar("RECEPCIONISTA");
  dependencias.auth.mockResolvedValue({
    user: { usuarioId: "usuario", email: "usuario@ejemplo.test" },
  });
  dependencias.listar.mockResolvedValue({
    clientes: [cliente(1, true), cliente(2, false)],
    total: 2,
  });
  dependencias.obtener.mockResolvedValue({
    ...cliente(1, true),
    id: clienteId,
  });
  dependencias.redirect.mockImplementation(() => {
    throw redireccion;
  });
  dependencias.notFound.mockImplementation(() => {
    throw noEncontrado;
  });
});

describe("listado de clientes", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])(
    "muestra datos completos y estados para %s",
    async (rol) => {
      autorizar(rol);

      const pagina = html(
        await ClientesPage({ searchParams: Promise.resolve({}) }),
      );

      expect(pagina).toContain("Nombre 1");
      expect(pagina).toContain("Apellido 1");
      expect(pagina).toContain("DNI-1");
      expect(pagina).toContain("11-5555-0001");
      expect(pagina).toContain("cliente1@ejemplo.test");
      expect(pagina).toContain("Localidad 1");
      expect(pagina).toContain("Provincia 1");
      expect(pagina).toContain("Activo");
      expect(pagina).toContain("Inactivo");
      expect(pagina).toContain('href="/clientes/cliente-1"');
      expect(pagina).toContain('href="/clientes/nuevo"');
      expect(pagina).toContain("Registrar cliente");
      expect(dependencias.autorizar).toHaveBeenCalledWith([
        "RECEPCIONISTA",
        "ENCARGADO_DEL_TALLER",
      ]);
      expect(dependencias.listar).toHaveBeenCalledExactlyOnceWith(1, 10);
    },
  );

  it.each(["MECANICO", "ADMINISTRADOR"])(
    "deniega a %s sin consultar clientes",
    async (rol) => {
      dependencias.autorizar.mockResolvedValue({
        autorizado: false,
        usuario: { rol },
      });

      const pagina = html(
        await ClientesPage({ searchParams: Promise.resolve({}) }),
      );

      expect(pagina).toContain("Acceso denegado");
      expect(dependencias.listar).not.toHaveBeenCalled();
    },
  );

  it.each(["0", "-1", "abc", "1.5", ["1", "2"]])(
    "redirige la página inválida %j sin consultar",
    async (page) => {
      await expect(
        ClientesPage({ searchParams: Promise.resolve({ page }) }),
      ).rejects.toBe(redireccion);

      expect(dependencias.redirect).toHaveBeenCalledWith("/clientes");
      expect(dependencias.listar).not.toHaveBeenCalled();
    },
  );

  it("pagina once clientes sin duplicados ni omisiones", async () => {
    const clientes = Array.from({ length: 11 }, (_, indice) =>
      cliente(indice + 1, indice % 2 === 0),
    );
    dependencias.listar.mockImplementation(async (page, limit) => ({
      clientes: clientes.slice((page - 1) * limit, page * limit),
      total: clientes.length,
    }));

    const primera = html(
      await ClientesPage({ searchParams: Promise.resolve({}) }),
    );
    const ultima = html(
      await ClientesPage({ searchParams: Promise.resolve({ page: "2" }) }),
    );

    expect(primera).toContain("Página 1 de 2");
    expect(primera).toContain('href="/clientes?page=2"');
    expect(primera).not.toContain("Nombre 11");
    expect(ultima).toContain("Página 2 de 2");
    expect(ultima).toContain('href="/clientes"');
    expect(ultima).toContain("Nombre 11");
    expect(ultima).not.toContain("Nombre 10</td>");
  });

  it("redirige una página fuera de rango a la última disponible", async () => {
    dependencias.listar.mockResolvedValue({ clientes: [], total: 11 });

    await expect(
      ClientesPage({ searchParams: Promise.resolve({ page: "3" }) }),
    ).rejects.toBe(redireccion);

    expect(dependencias.redirect).toHaveBeenCalledWith("/clientes?page=2");
  });

  it("muestra el estado vacío sin tabla ni paginación", async () => {
    dependencias.listar.mockResolvedValue({ clientes: [], total: 0 });

    const pagina = html(
      await ClientesPage({ searchParams: Promise.resolve({}) }),
    );

    expect(pagina).toContain("No hay clientes registrados");
    expect(pagina).not.toContain("<table");
    expect(pagina).not.toContain("Paginación de clientes");
  });
});

describe("detalle de cliente", () => {
  it.each(["RECEPCIONISTA", "ENCARGADO_DEL_TALLER"])(
    "muestra todos los datos para %s",
    async (rol) => {
      autorizar(rol);

      const pagina = html(
        await ClienteDetallePage({ params: Promise.resolve({ id: clienteId }) }),
      );

      expect(pagina).toContain("Nombre 1");
      expect(pagina).toContain("Apellido 1");
      expect(pagina).toContain("DNI-1");
      expect(pagina).toContain("11-5555-0001");
      expect(pagina).toContain("cliente1@ejemplo.test");
      expect(pagina).toContain("Calle 1");
      expect(pagina).toContain("Localidad 1");
      expect(pagina).toContain("Provincia 1");
      expect(pagina).toContain("Activo");
      expect(pagina).toContain('href="/clientes"');
      expect(pagina).toContain("Volver a clientes");
      expect(pagina).toContain(`href="/clientes/${clienteId}/editar"`);
      expect(pagina).toContain(">Editar</a>");
      expect(pagina).toContain("Dar de baja");
      expect(pagina).not.toContain("Confirmar baja");
      expect(dependencias.obtener).toHaveBeenCalledExactlyOnceWith(clienteId);
      expect(dependencias.autorizar).toHaveBeenCalledWith([
        "RECEPCIONISTA",
        "ENCARGADO_DEL_TALLER",
      ]);
    },
  );

  it("permite consultar un cliente inactivo", async () => {
    dependencias.obtener.mockResolvedValue({
      ...cliente(2, false),
      id: clienteId,
    });

    const pagina = html(
      await ClienteDetallePage({ params: Promise.resolve({ id: clienteId }) }),
    );

    expect(pagina).toContain("Nombre 2");
    expect(pagina).toContain("Inactivo");
    expect(pagina).not.toContain("Dar de baja");
    expect(pagina).toContain("Sus datos e historial se conservan");
    expect(pagina).toContain(`href="/clientes/${clienteId}/editar"`);
  });

  it.each(["MECANICO", "ADMINISTRADOR"])(
    "deniega a %s sin consultar el cliente",
    async (rol) => {
      dependencias.autorizar.mockResolvedValue({
        autorizado: false,
        usuario: { rol },
      });

      const pagina = html(
        await ClienteDetallePage({ params: Promise.resolve({ id: clienteId }) }),
      );

      expect(pagina).toContain("Acceso denegado");
      expect(dependencias.obtener).not.toHaveBeenCalled();
    },
  );

  it.each(["invalido", ""])(
    "responde como no encontrado para el ID %j sin consultar",
    async (id) => {
      await expect(
        ClienteDetallePage({ params: Promise.resolve({ id }) }),
      ).rejects.toBe(noEncontrado);

      expect(dependencias.notFound).toHaveBeenCalledOnce();
      expect(dependencias.obtener).not.toHaveBeenCalled();
    },
  );

  it("responde como no encontrado cuando el cliente no existe", async () => {
    dependencias.obtener.mockResolvedValue(null);

    await expect(
      ClienteDetallePage({ params: Promise.resolve({ id: clienteId }) }),
    ).rejects.toBe(noEncontrado);

    expect(dependencias.obtener).toHaveBeenCalledExactlyOnceWith(clienteId);
    expect(dependencias.notFound).toHaveBeenCalledOnce();
  });

  it("presenta estados de carga y error específicos", () => {
    const carga = html(<LoadingClienteDetalle />);
    expect(carga).toContain('role="status"');
    expect(carga).toContain("Cargando detalle del cliente");

    const error = html(
      <ClienteDetalleError error={new Error("fallo")} reset={vi.fn()} />,
    );
    expect(error).toContain('role="alert"');
    expect(error).toContain("No pudimos cargar el cliente");
    expect(error).toContain("Reintentar");
  });
});

describe("estados y navegación de clientes", () => {
  it("presenta estados de carga y error accesibles", () => {
    expect(html(<LoadingClientes />)).toContain('role="status"');

    const error = html(
      <ClientesError error={new Error("fallo")} reset={vi.fn()} />,
    );
    expect(error).toContain('role="alert"');
    expect(error).toContain("No pudimos cargar los clientes");
    expect(error).toContain("Reintentar");
  });

  it.each([
    ["RECEPCIONISTA", true],
    ["ENCARGADO_DEL_TALLER", true],
    ["MECANICO", false],
    ["ADMINISTRADOR", false],
  ])("navegación principal para %s", async (rol, puedeVerClientes) => {
    autorizar(rol);

    const pagina = html(await AppLayout({ children: <p>Contenido</p> }));

    expect(pagina.includes('href="/clientes"')).toBe(puedeVerClientes);
  });
});
