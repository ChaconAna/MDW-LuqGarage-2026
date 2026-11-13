import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const d = vi.hoisted(() => ({ cargarEntorno: vi.fn(), definirConfig: vi.fn((entrada: unknown) => entrada) }));
vi.mock("dotenv", () => ({ config: d.cargarEntorno }));
vi.mock("prisma/config", () => ({ defineConfig: d.definirConfig }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("PRUEBAS_PERSISTENCIA", "1");
  vi.stubEnv("GITHUB_ACTIONS", "true");
  const url = "postgresql://luqgarage_test:clave-ficticia@127.0.0.1:5432/luqgarage_test";
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("DIRECT_URL", url);
});
afterEach(() => vi.unstubAllEnvs());

describe("configuración de Prisma sin conexiones ni lectura de credenciales", () => {
  it("valida el modo persistencia sin cargar dotenv", async () => {
    await import("./prisma.config");
    expect(d.cargarEntorno).not.toHaveBeenCalled();
    expect(d.definirConfig).toHaveBeenCalledOnce();
  });

  it("detiene la configuración inválida sin recurrir a .env.local", async () => {
    vi.stubEnv("DIRECT_URL", undefined);
    await expect(import("./prisma.config")).rejects.toThrow(/Configuración/);
    expect(d.cargarEntorno).not.toHaveBeenCalled();
    expect(d.definirConfig).not.toHaveBeenCalled();
  });

  it.each([undefined, "0", "true"])("conserva la carga normal con indicador %s", async (modo) => {
    vi.stubEnv("PRUEBAS_PERSISTENCIA", modo);
    vi.stubEnv("DATABASE_URL", undefined);
    vi.stubEnv("DIRECT_URL", undefined);
    vi.stubEnv("GITHUB_ACTIONS", undefined);
    await import("./prisma.config");
    expect(d.cargarEntorno).toHaveBeenCalledExactlyOnceWith({ path: ".env.local" });
    expect(d.definirConfig).toHaveBeenCalledExactlyOnceWith({
      schema: "prisma/schema.prisma", migrations: { seed: "tsx prisma/seed.ts" },
    });
    expect(d.cargarEntorno.mock.invocationCallOrder[0]).toBeLessThan(d.definirConfig.mock.invocationCallOrder[0]!);
  });
});
