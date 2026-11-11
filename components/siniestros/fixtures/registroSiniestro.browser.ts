export const casosFormulario = [
  "envía campos, documentos y UUID seleccionados fuera de la página visible",
  "rechaza el tamaño excedido antes de invocar la Action y permite corregirlo",
  "muestra errores por campo y generales sin perder textos ni archivos",
  "bloquea envíos duplicados y los controles mientras espera el resultado",
  "conserva los valores al paginar y cambiar una selección",
  "exige las tres selecciones antes de habilitar el envío",
  "mantiene etiquetas, foco y ancho de 375 px con nombres de archivo largos",
  "sitúa el error de selección de URL debajo del grupo correspondiente",
] as const;

// Fixture ejecutada en un navegador real. La Action y el router se sustituyen
// en el bundle de pruebas; no se importa ni se ejecuta persistencia o Storage.
export const escenarioFormulario = String.raw`
import React from "react";
import { createRoot } from "react-dom/client";
import Formulario from "@/components/siniestros/FormularioRegistroSiniestro";
import Navegacion from "@/components/siniestros/NavegacionSelectores";
import Clientes from "@/components/siniestros/SelectorClienteActivo";
import Vehiculos from "@/components/siniestros/SelectorVehiculoActivo";
import Aseguradoras from "@/components/siniestros/SelectorAseguradoraActiva";

const root = createRoot(document.getElementById("root"));
const uid = n => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const clientes = Array.from({length: 11}, (_, i) => ({id: uid(i+1), nombre: "Cliente " + i, apellido: "Prueba", dni: "20000000"}));
const vehiculos = Array.from({length: 11}, (_, i) => ({id: uid(i+101), patente: "AA" + i + "BB", modelo: {nombre: "Modelo", marca: {nombre: "Marca"}}}));
const aseguradoras = Array.from({length: 11}, (_, i) => ({id: uid(i+201), nombre: "Aseguradora " + i, cuit: "30123456789"}));
const inicial = new URLSearchParams({clienteId: uid(11), vehiculoId: uid(111), aseguradoraId: uid(211)}).toString();
let version = 0, llamadas = [], resultado, diferir, resolver;
const exigir = (condicion, mensaje) => { if (!condicion) throw new Error(mensaje); };
const pausa = () => new Promise(resolve => setTimeout(resolve, 10));
async function esperar(condicion) {
  const hasta = Date.now() + 10000;
  while (!condicion()) { if (Date.now() > hasta) throw new Error("Timeout esperando el formulario"); await pausa(); }
}
function App() {
  const q = new URLSearchParams(location.search);
  const selecciones = {clienteId: q.get("clienteId") || undefined, vehiculoId: q.get("vehiculoId") || undefined, aseguradoraId: q.get("aseguradoraId") || undefined};
  const cp = Number(q.get("clientesPage") || 1), vp = Number(q.get("vehiculosPage") || 1), ap = Number(q.get("aseguradorasPage") || 1);
  const paginacion = pagina => ({pagina, totalPaginas: 2, total: 11, limite: 10});
  return <div data-escenario={version} className="mx-auto max-w-4xl p-6 sm:p-8"><Navegacion seleccionesValidas={selecciones}>
    <h1>Registrar siniestro</h1><Formulario seleccionesValidas={selecciones}
      selectorCliente={<section data-entidad="clienteId"><h2>Clientes activos</h2><Clientes clientes={clientes.slice((cp-1)*10, cp*10)} clienteSeleccionado={clientes.find(x => x.id === selecciones.clienteId) || null} errorSeleccion={q.has("clienteError") ? "Cliente inválido simulado" : undefined} {...paginacion(cp)}/></section>}
      selectorVehiculo={<section data-entidad="vehiculoId"><h2>Vehículos activos</h2><Vehiculos vehiculos={vehiculos.slice((vp-1)*10, vp*10)} vehiculoSeleccionado={vehiculos.find(x => x.id === selecciones.vehiculoId) || null} {...paginacion(vp)}/></section>}
      selectorAseguradora={<section data-entidad="aseguradoraId"><h2>Aseguradoras activas</h2><Aseguradoras aseguradoras={aseguradoras.slice((ap-1)*10, ap*10)} aseguradoraSeleccionada={aseguradoras.find(x => x.id === selecciones.aseguradoraId) || null} {...paginacion(ap)}/></section>}
    /></Navegacion></div>;
}
window.__navegar = href => { history.pushState(null, "", href); root.render(<App key={version}/>); };
window.__accionSimulada = async (_anterior, fd) => {
  llamadas.push(fd);
  if (diferir) await new Promise(resolve => { resolver = resolve; });
  return resultado;
};
async function montar(query = inicial) {
  version++; llamadas = []; diferir = false; resolver = undefined;
  resultado = {errores: {}, errorGeneral: "Error general simulado"};
  history.replaceState(null, "", "/siniestros/nuevo" + (query ? "?" + query : ""));
  root.render(<App key={version}/>);
  await esperar(() => document.querySelector('[data-escenario="' + version + '"] form'));
  await pausa();
}
function valor(id, texto) {
  const input = document.getElementById(id);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, texto);
  input.dispatchEvent(new Event("input", {bubbles: true}));
  input.dispatchEvent(new Event("change", {bubbles: true}));
}
function archivo(input, tamano = 8) {
  const seleccion = new DataTransfer();
  seleccion.items.add(new File([new Uint8Array(tamano)], "fotografia_con_nombre_largo_".repeat(8) + ".jpg", {type: "image/jpeg"}));
  if (input.multiple) seleccion.items.add(new File(["adicional"], "segunda.jpg", {type: "image/jpeg"}));
  input.files = seleccion.files;
  input.dispatchEvent(new Event("change", {bubbles: true}));
}
async function completar(tamanoPrimero = 8) {
  valor("numero-siniestro", "SIN-UI-001"); valor("numero-poliza", "POL-000123"); valor("fecha-siniestro", "2026-11-05");
  document.getElementById("grado-MODERADO").click();
  document.querySelectorAll('input[type="file"]').forEach((input, i) => archivo(input, i === 0 ? tamanoPrimero : 8));
  await pausa();
}
const boton = () => document.querySelector('button[type="submit"]');
const pendiente = () => document.querySelector("form").getAttribute("aria-busy") === "true";
const captura = () => JSON.stringify({
  numero: document.getElementById("numero-siniestro").value, fecha: document.getElementById("fecha-siniestro").value,
  poliza: document.getElementById("numero-poliza").value, grado: document.querySelector('input[name="gradoDano"]:checked')?.value,
  archivos: [...document.querySelectorAll('input[type="file"]')].map(input => [...input.files].map(file => ({nombre: file.name, size: file.size}))),
});
async function enviar() {
  exigir(!boton().disabled, "El botón debe estar habilitado"); boton().click();
  // Una alerta de un intento anterior no significa que el nuevo intento terminó.
  await pausa();
  await esperar(() => !pendiente() && document.querySelector('[role="alert"]'));
  await pausa();
}
const pruebas = [
  async () => {
    exigir(document.querySelectorAll('input[name="clienteId"]:checked,input[name="vehiculoId"]:checked,input[name="aseguradoraId"]:checked').length === 0, "Selecciones fuera de página");
    await completar(); await enviar();
    exigir(llamadas.length === 1, "Una invocación de la Action"); const fd = llamadas[0];
    for (const [campo, esperado] of Object.entries({numeroSiniestro: "SIN-UI-001", fechaSiniestro: "2026-11-05", gradoDano: "MODERADO", numeroPoliza: "POL-000123", clienteId: uid(11), vehiculoId: uid(111), aseguradoraId: uid(211)})) {
      exigir(fd.getAll(campo).length === 1 && fd.get(campo) === esperado, "Escalar incorrecto: " + campo);
    }
    const tipos = ["DENUNCIA", "LATERAL_DERECHA", "LATERAL_IZQUIERDA", "FRONTAL", "TRASERA", "CERTIFICADO_COBERTURA", "ADICIONAL", "ADICIONAL"];
    exigir([...fd.entries()].length === 23, "Siete escalares y ocho pares documentales");
    tipos.forEach((tipo, i) => { exigir(fd.get("documentos[" + i + "][tipo]") === tipo, "Categoría " + i); exigir(fd.get("documentos[" + i + "][archivo]") instanceof File, "File " + i); });
    exigir((await fd.get("documentos[7][archivo]").text()) === "adicional", "Contenido del archivo adicional");
  },
  async () => {
    await completar(4 * 1024 * 1024); const antes = captura(); await enviar();
    exigir(llamadas.length === 0, "No llamar la Action cuando se excede el límite");
    exigir(document.querySelector('[role="alert"]').textContent.includes("4 MiB"), "Mensaje de tamaño claro");
    exigir(captura() === antes, "Conservar archivos y textos tras exceso");
    archivo(document.querySelector('input[type="file"]')); await pausa(); await enviar();
    exigir(llamadas.length === 1, "Permitir corregir el archivo y reenviar");
  },
  async () => {
    resultado = {errores: {numeroSiniestro: "Número duplicado simulado", clienteId: "Cliente no disponible simulado", vehiculoId: "Vehículo no disponible simulado", aseguradoraId: "Aseguradora no disponible simulada", DENUNCIA: "Archivo inválido simulado", documentos: "Falta documentación simulada"}, errorGeneral: "Número duplicado simulado"};
    await completar(); const antes = captura(); await enviar();
    const numero = document.getElementById("numero-siniestro");
    exigir(numero.getAttribute("aria-invalid") === "true" && numero.getAttribute("aria-describedby") === "error-numero-siniestro", "Asociación de error por campo");
    exigir(document.getElementById("error-numero-siniestro").textContent.includes("duplicado"), "Error del número");
    exigir(document.getElementById("documento-DENUNCIA").getAttribute("aria-invalid") === "true", "Error documental");
    exigir(document.body.textContent.includes("Cliente no disponible simulado"), "Error de selección fuera de página");
    exigir(document.querySelector('form > [role="alert"]').textContent === "Número duplicado simulado", "Motivo de negocio concreto arriba del formulario");
    for (const [entidad, idError, mensaje] of [
      ["clienteId", "error-cliente-activo", "Cliente no disponible simulado"],
      ["vehiculoId", "error-vehiculo-activo", "Vehículo no disponible simulado"],
      ["aseguradoraId", "error-aseguradora-activa", "Aseguradora no disponible simulada"],
    ]) {
      const selector = document.querySelector('[data-entidad="' + entidad + '"]');
      const error = document.getElementById(idError);
      exigir(selector && error && selector.nextElementSibling === error, "Error inmediatamente después del selector de " + entidad);
      exigir(error.textContent.includes(mensaje), "Motivo específico de " + entidad);
      exigir(selector.parentElement.getAttribute("role") === "group" && selector.parentElement.getAttribute("aria-describedby") === idError, "Error asociado únicamente al grupo de " + entidad);
    }
    const campoArchivo = document.getElementById("documento-DENUNCIA");
    exigir(campoArchivo.compareDocumentPosition(document.getElementById("error-DENUNCIA")) & Node.DOCUMENT_POSITION_FOLLOWING, "Error documental debajo del archivo");
    const errorDocumentos = document.getElementById("error-documentos");
    exigir(document.getElementById("documento-CERTIFICADO_COBERTURA").compareDocumentPosition(errorDocumentos) & Node.DOCUMENT_POSITION_FOLLOWING, "Error del grupo debajo de los documentos");
    exigir(errorDocumentos.closest("fieldset").getAttribute("aria-describedby") === errorDocumentos.id, "Error documental asociado al grupo");
    exigir(captura() === antes, "No reiniciar textos o FileLists al devolver errores");
    exigir(document.activeElement === numero, "Foco sobre el primer campo inválido");
    valor("numero-siniestro", "SIN-CORREGIDO"); await pausa(); await enviar();
    exigir(llamadas.length === 2 && llamadas[1].get("numeroSiniestro") === "SIN-CORREGIDO", "Reenvío después de corregir");
  },
  async () => {
    diferir = true; await completar();
    const form = document.querySelector("form"), query = location.search;
    form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
    form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
    await esperar(() => llamadas.length === 1 && pendiente());
    exigir(boton().disabled && boton().textContent === "Registrando…", "Bloquear y mostrar estado de envío");
    exigir(document.getElementById("numero-siniestro").matches(":disabled"), "Bloquear datos durante envío");
    exigir(document.querySelector('input[name="clienteId"]').matches(":disabled"), "Bloquear radios durante envío");
    document.querySelector('[data-entidad="clienteId"] nav a').click();
    form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true})); await pausa();
    exigir(location.search === query && llamadas.length === 1, "No paginar ni duplicar mientras está pendiente");
    resolver(); await esperar(() => !pendiente()); exigir(!boton().disabled, "Volver a habilitar tras error");
  },
  async () => {
    await completar(); const antes = captura();
    for (const entidad of ["clienteId", "vehiculoId", "aseguradoraId"]) {
      document.querySelector('[data-entidad="' + entidad + '"] nav a').click();
      await esperar(() => document.querySelectorAll('input[name="' + entidad + '"]').length === 1);
      exigir(document.querySelector('input[name="' + entidad + '"]').checked, "Selección marcada en página 2");
      exigir(captura() === antes, "Conservar datos al paginar " + entidad);
    }
    document.querySelector('[data-entidad="clienteId"] nav a').click();
    await esperar(() => document.querySelectorAll('input[name="clienteId"]').length === 10);
    document.querySelector('input[name="clienteId"]').click();
    await esperar(() => new URLSearchParams(location.search).get("clienteId") === uid(1) && !boton().disabled);
    exigir(captura() === antes, "Conservar textos y archivos al cambiar cliente"); await enviar();
    exigir(llamadas[0].get("clienteId") === uid(1) && llamadas[0].get("vehiculoId") === uid(111) && llamadas[0].get("aseguradoraId") === uid(211), "Enviar selección actual sin perder las otras");
    exigir(captura() === antes, "Conservar datos tras error después de paginar");
  },
  async () => {
    await montar(""); exigir(boton().disabled, "No enviar datos incompletos"); await completar();
    exigir(boton().disabled, "No enviar sin los UUID");
    document.querySelector("form").dispatchEvent(new Event("submit", {bubbles: true, cancelable: true})); await pausa();
    exigir(llamadas.length === 0, "Rechazar submit programático sin selección");
    for (const entidad of ["clienteId", "vehiculoId", "aseguradoraId"]) {
      document.querySelector('input[name="' + entidad + '"]').click();
      await esperar(() => new URLSearchParams(location.search).has(entidad)); await pausa();
    }
    await esperar(() => !boton().disabled);
  },
  async () => {
    await completar();
    exigir(innerWidth === 375, "Viewport de 375 px");
    exigir(document.documentElement.scrollWidth <= document.documentElement.clientWidth, "No desbordar horizontalmente");
    exigir([...document.querySelectorAll("input")].every(input => input.labels.length > 0), "Etiquetas de todos los controles");
    boton().focus(); exigir(document.activeElement === boton(), "Botón accesible mediante foco");
    exigir(document.querySelector('input[name="gradoDano"]:checked').value === "MODERADO", "Radio nativo de grado");
  },
  async () => {
    await montar(inicial + "&clienteError=1");
    const grupo = document.querySelector('[data-entidad="clienteId"] fieldset');
    const error = document.getElementById("error-seleccion-cliente");
    exigir(grupo && error && grupo.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING, "Error debajo del selector de cliente");
    exigir(grupo.getAttribute("aria-describedby") === error.id, "Error de URL asociado al grupo de radios");
  },
];
(async () => {
  const reportes = [];
  for (let i = 0; i < pruebas.length; i++) {
    try { await montar(); await pruebas[i](); reportes.push({nombre: nombres[i], error: null}); }
    catch (error) { reportes.push({nombre: nombres[i], error: String(error)}); }
    finally { if (resolver) resolver(); }
  }
  await fetch("/__resultado?datos=" + encodeURIComponent(JSON.stringify(reportes)));
})().catch(error => fetch("/__resultado?datos=" + encodeURIComponent(JSON.stringify([{nombre: "fixture", error: String(error)}]))));
`;
