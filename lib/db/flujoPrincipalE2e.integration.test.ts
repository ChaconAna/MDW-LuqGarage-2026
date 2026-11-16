import { randomBytes, randomUUID } from "node:crypto";

import { expect, it, vi } from "vitest";

import { validarEntornoAutenticacionE2e } from "../schemas/entornoE2e";
import { validarEntornoPruebas } from "../schemas/entornoPruebas";

const AUTH_URL_E2E = "http://127.0.0.1:3000";

it("crea, protege y limpia el fixture del flujo principal en PostgreSQL", async () => {
  if (process.env.PRUEBAS_PERSISTENCIA !== "1") {
    throw new Error(
      "La integración requiere PRUEBAS_PERSISTENCIA=1 y PostgreSQL temporal autorizado en GitHub Actions.",
    );
  }
  validarEntornoPruebas(process.env);

  vi.stubEnv("AUTENTICACION_E2E", "1");
  vi.stubEnv(
    "AUTENTICACION_E2E_CREDENCIAL",
    randomBytes(32).toString("hex"),
  );
  vi.stubEnv("AUTENTICACION_E2E_USUARIO_ID", randomUUID());
  vi.stubEnv("AUTH_URL", AUTH_URL_E2E);

  const errores: Error[] = [];
  let prisma: Awaited<typeof import("./client")>["prisma"] | undefined;
  let manifiesto:
    | Awaited<
        ReturnType<
          typeof import("./flujoPrincipalE2e")["prepararFlujoPrincipalE2e"]
        >
      >
    | undefined;
  let fixtureActivo = false;

  try {
    if (
      !validarEntornoAutenticacionE2e({
        ...process.env,
        AUTH_URL: AUTH_URL_E2E,
        NODE_ENV: "production",
      })
    ) {
      throw new Error("La autenticación E2E no está habilitada.");
    }

    const [clienteDb, fixture] = await Promise.all([
      import("./client"),
      import("./flujoPrincipalE2e"),
    ]);
    prisma = clienteDb.prisma;

    manifiesto = await fixture.prepararFlujoPrincipalE2e();
    fixtureActivo = true;

    const leerRegistros = () =>
      Promise.all([
        prisma!.provincia.findUnique({
          where: { id: manifiesto!.provincia.id },
        }),
        prisma!.localidad.findUnique({
          where: { id: manifiesto!.localidad.id },
        }),
        prisma!.cliente.findUnique({
          where: { id: manifiesto!.cliente.id },
        }),
        prisma!.marca.findUnique({ where: { id: manifiesto!.marca.id } }),
        prisma!.modelo.findUnique({ where: { id: manifiesto!.modelo.id } }),
        prisma!.tipoVehiculo.findUnique({
          where: { id: manifiesto!.tipoVehiculo.id },
        }),
        prisma!.vehiculo.findUnique({
          where: { id: manifiesto!.vehiculo.id },
        }),
        prisma!.aseguradora.findUnique({
          where: { id: manifiesto!.aseguradora.id },
        }),
        prisma!.sector.findUnique({ where: { id: manifiesto!.sector.id } }),
        prisma!.reparacion.findUnique({
          where: { id: manifiesto!.reparacion.id },
        }),
      ]);

    const registrosCreados = await leerRegistros();
    expect(registrosCreados.filter(Boolean)).toHaveLength(10);

    const [
      provincia,
      localidad,
      cliente,
      marca,
      modelo,
      tipoVehiculo,
      vehiculo,
      aseguradora,
      sector,
      reparacion,
    ] = registrosCreados;

    expect(provincia).toMatchObject(manifiesto.provincia);
    expect(localidad).toMatchObject(manifiesto.localidad);
    expect(cliente).toMatchObject(manifiesto.cliente);
    expect(marca).toMatchObject(manifiesto.marca);
    expect(modelo).toMatchObject(manifiesto.modelo);
    expect(tipoVehiculo).toMatchObject(manifiesto.tipoVehiculo);
    expect(vehiculo).toMatchObject(manifiesto.vehiculo);
    expect(aseguradora).toMatchObject(manifiesto.aseguradora);
    expect(sector).toMatchObject(manifiesto.sector);
    expect(reparacion).toMatchObject(manifiesto.reparacion);

    expect(localidad?.provinciaId).toBe(provincia?.id);
    expect(cliente?.localidadId).toBe(localidad?.id);
    expect(modelo?.marcaId).toBe(marca?.id);
    expect(vehiculo).toMatchObject({
      modeloId: modelo?.id,
      tipoVehiculoId: tipoVehiculo?.id,
    });
    expect(reparacion?.sectorId).toBe(sector?.id);

    const conteosAntes = await Promise.all([
      prisma.provincia.count({ where: manifiesto.provincia }),
      prisma.localidad.count({ where: manifiesto.localidad }),
      prisma.cliente.count({ where: manifiesto.cliente }),
      prisma.marca.count({ where: manifiesto.marca }),
      prisma.modelo.count({ where: manifiesto.modelo }),
      prisma.tipoVehiculo.count({ where: manifiesto.tipoVehiculo }),
      prisma.vehiculo.count({ where: manifiesto.vehiculo }),
      prisma.aseguradora.count({ where: manifiesto.aseguradora }),
      prisma.sector.count({ where: manifiesto.sector }),
      prisma.reparacion.count({ where: manifiesto.reparacion }),
    ]);
    expect(conteosAntes).toEqual(Array.from({ length: 10 }, () => 1));

    await expect(fixture.prepararFlujoPrincipalE2e()).rejects.toThrow(
      /entran en conflicto/,
    );
    expect(await leerRegistros()).toEqual(registrosCreados);

    await fixture.eliminarFlujoPrincipalE2e(manifiesto);
    fixtureActivo = false;

    const registrosEliminados = await leerRegistros();
    expect(registrosEliminados).toEqual(
      Array.from({ length: 10 }, () => null),
    );
  } catch {
    errores.push(
      new Error(
        "Falló la integración del fixture del flujo principal en PostgreSQL temporal.",
      ),
    );
  } finally {
    if (fixtureActivo && manifiesto && prisma) {
      try {
        const fixture = await import("./flujoPrincipalE2e");
        await fixture.eliminarFlujoPrincipalE2e(manifiesto);
      } catch {
        errores.push(
          new Error(
            "Falló la limpieza final del fixture del flujo principal E2E.",
          ),
        );
      }
    }

    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch {
        errores.push(
          new Error("Falló la desconexión de PostgreSQL temporal."),
        );
      }
    }

    vi.unstubAllEnvs();
  }

  if (errores.length > 0) {
    throw new AggregateError(
      errores,
      "Falló la prueba de integración del fixture E2E o su limpieza.",
    );
  }
});
