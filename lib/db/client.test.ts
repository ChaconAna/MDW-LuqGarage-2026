import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const d = vi.hoisted(() => ({
  construirPrisma: vi.fn(function () { return { simulado: true }; }),
}));
vi.mock("@prisma/client", () => ({ PrismaClient: d.construirPrisma }));

const globalParaPrisma = globalThis as typeof globalThis & { prisma?: unknown };
const url = "postgresql://luqgarage_test:clave-ficticia@127.0.0.1:5432/luqgarage_test";
let descriptorOriginal: PropertyDescriptor | undefined;

beforeEach(() => {
  descriptorOriginal = Object.getOwnPropertyDescriptor(globalThis, "prisma");
  delete globalParaPrisma.prisma;
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("PRUEBAS_PERSISTENCIA", "1");
  vi.stubEnv("GITHUB_ACTIONS", "true");
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("DIRECT_URL", url);
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  if (descriptorOriginal) {
    Object.defineProperty(globalThis, "prisma", descriptorOriginal);
  } else {
    delete globalParaPrisma.prisma;
  }
  vi.resetModules();
  vi.clearAllMocks();
});

describe("cliente Prisma protegido sin conexiones reales", () => {
  it.each([false, true])("rechaza un entorno inválido antes de crear o reutilizar Prisma (global: %s)", async (conGlobal) => {
    const anterior = { anterior: true };
    if (conGlobal) globalParaPrisma.prisma = anterior;
    vi.stubEnv("DIRECT_URL", undefined);

    await expect(import("./client")).rejects.toThrow(/Configuración/);

    expect(d.construirPrisma).not.toHaveBeenCalled();
    expect(globalParaPrisma.prisma).toBe(conGlobal ? anterior : undefined);
  });

  it.each([false, true])("usa la URL validada sin reutilizar ni escribir el global (global: %s)", async (conGlobal) => {
    const anterior = { anterior: true };
    if (conGlobal) globalParaPrisma.prisma = anterior;

    const { prisma } = await import("./client");

    expect(d.construirPrisma).toHaveBeenCalledExactlyOnceWith({ datasourceUrl: url });
    expect(prisma).toBe(d.construirPrisma.mock.results[0]?.value);
    expect(prisma).not.toBe(anterior);
    expect(globalParaPrisma.prisma).toBe(conGlobal ? anterior : undefined);
    expect((await import("./client")).prisma).toBe(prisma);
    expect(d.construirPrisma).toHaveBeenCalledOnce();
  });

  it("rechaza un destino remoto sin exponer la URL ni credenciales", async () => {
    const secreto = "SECRETO_NO_PUBLICAR";
    const conexion = `postgresql://usuario_privado:${secreto}@remoto.example.com:5432/produccion`;
    vi.stubEnv("DATABASE_URL", conexion);
    vi.stubEnv("DIRECT_URL", conexion);

    const error: unknown = await import("./client").catch((causa: unknown) => causa);

    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error)) throw new Error("Se esperaba un error de configuración");
    expect(error.message).toMatch(/Configuración/);
    expect(error.cause).toBeUndefined();
    const diagnostico = `${error.message} ${error.stack} ${JSON.stringify(error)}`;
    for (const dato of [secreto, conexion, "usuario_privado", "remoto.example.com"]) {
      expect(diagnostico).not.toContain(dato);
    }
    expect(d.construirPrisma).not.toHaveBeenCalled();
  });
});

describe("comportamiento normal del cliente Prisma", () => {
  beforeEach(() => {
    vi.stubEnv("PRUEBAS_PERSISTENCIA", undefined);
    vi.stubEnv("DATABASE_URL", undefined);
    vi.stubEnv("DIRECT_URL", undefined);
    vi.stubEnv("GITHUB_ACTIONS", undefined);
  });

  it.each(["development", "test", "production"] as const)("conserva la creación y caché en %s", async (entorno) => {
    vi.stubEnv("NODE_ENV", entorno);

    const { prisma } = await import("./client");

    expect(d.construirPrisma).toHaveBeenCalledExactlyOnceWith();
    expect(prisma).toBe(d.construirPrisma.mock.results[0]?.value);
    expect(globalParaPrisma.prisma).toBe(entorno === "production" ? undefined : prisma);
  });

  it.each(["development", "test", "production"] as const)("reutiliza una instancia global existente en %s", async (entorno) => {
    vi.stubEnv("NODE_ENV", entorno);
    const anterior = { anterior: true };
    globalParaPrisma.prisma = anterior;

    const { prisma } = await import("./client");

    expect(prisma).toBe(anterior);
    expect(globalParaPrisma.prisma).toBe(anterior);
    expect(d.construirPrisma).not.toHaveBeenCalled();
  });

  it.each(["", "0", "true", "01"])("no activa el modo persistencia con indicador %s", async (modo) => {
    vi.stubEnv("PRUEBAS_PERSISTENCIA", modo);

    const { prisma } = await import("./client");

    expect(d.construirPrisma).toHaveBeenCalledExactlyOnceWith();
    expect(globalParaPrisma.prisma).toBe(prisma);
  });
});
