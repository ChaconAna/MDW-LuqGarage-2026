import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";

import { build } from "esbuild";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { casosFormulario, escenarioFormulario } from "./fixtures/ordenTrabajo.browser";

const navegador = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((archivo): archivo is string => Boolean(archivo && existsSync(archivo)));
const carpetaCss = path.resolve(".next/static/css");
const archivosCss = existsSync(carpetaCss)
  ? readdirSync(carpetaCss).filter((archivo) => archivo.endsWith(".css"))
  : [];
const css = archivosCss.map((archivo) => readFileSync(path.join(carpetaCss, archivo), "utf8")).join("\n");

type Reporte = { nombre: string; error: string | null };

// Requiere Chrome/Chromium local; no descarga navegadores ni instala dependencias.
// El caso responsive usa el CSS real generado por npm run build.
describe.skipIf(!navegador)("integración del formulario en navegador", () => {
  let chrome: ChildProcess | undefined;
  let servidor: Server | undefined;
  let perfil: string | undefined;
  let reportes: Reporte[] = [];
  let requestsDeEscritura = 0;

  beforeAll(async () => {
    expect(archivosCss.length).toBeGreaterThan(0);
    const bundle = await build({
      stdin: {
        contents: `const nombres = ${JSON.stringify(casosFormulario)};\n${escenarioFormulario}`,
        loader: "tsx",
        resolveDir: process.cwd(),
      },
      bundle: true,
      write: false,
      metafile: true,
      platform: "browser",
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"production"' },
      alias: { "@": process.cwd() },
      logLevel: "silent",
      plugins: [{
        name: "dependencias-simuladas",
        setup(compilador) {
          compilador.onResolve({ filter: /ordenes-trabajo[\\/]actions$/ }, () => ({ path: "action", namespace: "simulado" }));
          compilador.onResolve({ filter: /^next\/(navigation|link)$/ }, (args) => ({ path: args.path, namespace: "simulado" }));
          compilador.onLoad({ filter: /.*/, namespace: "simulado" }, (args) => ({
            loader: "jsx",
            resolveDir: process.cwd(),
            contents: args.path === "action"
              ? "export const crearOrdenTrabajoAction = (...args) => window.__crear(...args); export const incorporarPresupuestosOrdenTrabajoAction = (...args) => window.__incorporar(...args); export const consultarPresupuestosDisponiblesAction = (...args) => window.__catalogo(...args);"
              : args.path.endsWith("navigation")
                ? "export const useRouter = () => ({replace: href => window.__navegar(href)}); export const usePathname = () => location.pathname; export const useSearchParams = () => new URLSearchParams(location.search);"
                : 'import React from "react"; export default function Link({href, children, ...props}) { return <a {...props} href={href} onClick={e => { if (e.defaultPrevented) return; e.preventDefault(); window.__navegar(href); }}>{children}</a>; }',
          }));
        },
      }],
    });

    // Garantiza que el bundle no puede alcanzar los servicios reales de escritura.
    expect(Object.keys(bundle.metafile.inputs).some((archivo) =>
      /lib[\\/](db[\\/]|services[\\/](supabaseStorage|siniestro\.ts))/.test(archivo),
    )).toBe(false);

    let entregar: (reportes: Reporte[]) => void = () => { throw new Error("Receptor no inicializado."); };
    const resultados = new Promise<Reporte[]>((resolve) => { entregar = resolve; });
    servidor = createServer((request, response) => {
      if (request.method !== "GET") {
        requestsDeEscritura++;
        response.writeHead(405).end();
        return;
      }
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname === "/__resultado") {
        entregar(JSON.parse(url.searchParams.get("datos") ?? "[]") as Reporte[]);
        response.end("OK");
      } else if (url.pathname === "/bundle.js") {
        response.setHeader("Content-Type", "text/javascript");
        response.end(bundle.outputFiles[0]?.text);
      } else if (url.pathname === "/estilos.css") {
        response.setHeader("Content-Type", "text/css");
        response.end(css);
      } else {
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-src 'self'");
        response.end(url.pathname === "/"
          ? '<!doctype html><html lang="es"><body><iframe src="/siniestros/nuevo" width="375" height="812" title="Formulario de prueba"></iframe></body></html>'
          : '<!doctype html><html lang="es" class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/estilos.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
      }
    });
    servidor.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    const direccion = servidor.address();
    if (!direccion || typeof direccion === "string") throw new Error("Servidor local no disponible.");
    perfil = mkdtempSync(path.join(tmpdir(), "luq-ot-integracion-"));
    chrome = spawn(navegador!, [
      "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
      "--disable-background-networking", "--disable-component-update", "--disable-sync",
      "--user-data-dir=" + perfil, "http://127.0.0.1:" + direccion.port,
    ], { windowsHide: true, stdio: "ignore" });

    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      reportes = await Promise.race([
        resultados,
        new Promise<never>((_resolve, reject) => { timeout = setTimeout(() => reject(new Error("Chrome no devolvió el resultado de integración.")), 40000); }),
        new Promise<never>((_resolve, reject) => { chrome?.once("error", reject); }),
      ]);
      expect(reportes.map(({ nombre }) => nombre)).toEqual([...casosFormulario]);
    } finally {
      clearTimeout(timeout);
    }
  }, 60000);

  afterAll(async () => {
    if (chrome && chrome.exitCode === null && !chrome.killed) {
      const terminado = once(chrome, "close");
      chrome.kill();
      await terminado;
    }
    servidor?.closeAllConnections();
    if (servidor?.listening) await new Promise<void>((resolve) => servidor?.close(() => resolve()));
    if (perfil) {
      const destino = path.resolve(perfil);
      if (path.dirname(destino) === path.resolve(tmpdir()) && path.basename(destino).startsWith("luq-ot-integracion-")) {
        await rm(destino, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
    }
  });

  for (const nombre of casosFormulario) {
    it(nombre, () => {
      expect(reportes.find((reporte) => reporte.nombre === nombre)?.error).toBeNull();
      expect(requestsDeEscritura).toBe(0);
    });
  }
});
