export const casosFormulario = [
  "crea con once opciones paginadas, conserva filas y suma decimales exactos",
  "conserva valores y muestra el rechazo de negocio arriba y errores por fila",
  "bloquea envíos duplicados y controles durante el guardado",
  "recupera y edita un borrador sin enviar campos inmutables",
  "impide duplicar opciones y quitar la última reparación; permite quitar todos los repuestos",
  "informa una falla de catálogo sin perder las filas y permite reintentar",
  "muestra catálogos vacíos y permite corregir errores sin salir",
  "invalida sólo los errores de reparaciones al quitar o agregar filas y muestra errores nuevos",
  "invalida sólo los errores de repuestos al quitar o agregar filas y muestra errores nuevos",
  "mantiene etiquetas, foco y ancho de 375 px",
] as const;

// Ejecuta React real con Actions simuladas; no carga persistencia ni servicios externos.
export const escenarioFormulario = String.raw`
import React from "react";
import { createRoot } from "react-dom/client";
import Formulario from "@/components/presupuestos/FormularioPresupuesto";

const root = createRoot(document.getElementById("root"));
const id = n => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const reparaciones = Array.from({length: 11}, (_, i) => ({id: id(i + 1), nombre: "Reparación " + (i + 1)}));
const repuestos = Array.from({length: 11}, (_, i) => ({id: id(i + 101), nombre: "Repuesto " + (i + 1)}));
let llamadas, lecturas, respuesta, diferir, resolver, fallaCatalogo, montaje = 0;
const pausa = ms => new Promise(resolve => setTimeout(resolve, ms));
const exigir = (valor, mensaje) => { if (!valor) throw new Error(mensaje); };
async function hasta(condicion) {
  for (let i=0; i<400; i++) { if (condicion()) return; await pausa(10); }
  throw new Error("Tiempo agotado esperando el estado del formulario");
}
function registrar(modo, datos, presupuestoId, siniestroId) {
  llamadas.push({modo, datos, presupuestoId, siniestroId});
  return diferir ? new Promise(resolve => {resolver = resolve;}) : Promise.resolve(respuesta);
}
window.__crear = (siniestroId, _anterior, datos) => registrar("crear", datos, undefined, siniestroId);
window.__actualizar = (presupuestoId, _anterior, datos) => registrar("editar", datos, presupuestoId);
window.__catalogo = async query => {
  lecturas.push(query);
  if (fallaCatalogo) return {ok: false, error: "No pudimos cargar el catálogo simulado."};
  const opciones = query.tipo === "reparaciones" ? reparaciones : repuestos;
  return {ok: true, opciones: opciones.slice((query.page - 1)*10, query.page*10), total: opciones.length, pagina: query.page};
};
async function montar(inicial, vacio = false) {
  llamadas = []; lecturas = []; respuesta = {errores: {}}; diferir = false; fallaCatalogo = false;
  root.render(<Formulario key={++montaje} {...(inicial ? {inicial} : {accionCrear: window.__crear.bind(null, id(500))})}
    catalogoReparaciones={{opciones: vacio ? [] : reparaciones.slice(0, 10), total: vacio ? 0 : 11}}
    catalogoRepuestos={{opciones: vacio ? [] : repuestos.slice(0, 10), total: vacio ? 0 : 11}} />);
  await pausa(20);
  await hasta(() => document.getElementById("numero-presupuesto"));
}
async function escribir(campo, valor) {
  const input = document.getElementById(campo);
  exigir(input, "Existe campo " + campo);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, valor);
  input.dispatchEvent(new Event("input", {bubbles: true}));
  await pausa(10);
}
function seccion(tipo) { return document.querySelector('[aria-labelledby="titulo-' + tipo + '"]'); }
function botonCatalogo(tipo, texto) { return [...seccion(tipo).querySelectorAll("button")].find(b => b.textContent === texto); }
async function agregar(tipo, numero) {
  const catalogo = tipo === "reparaciones" ? reparaciones : repuestos;
  const selector = document.getElementById("catalogo-" + tipo);
  selector.value = catalogo[numero - 1].id;
  selector.dispatchEvent(new Event("change", {bubbles: true}));
  await pausa(10);
  botonCatalogo(tipo, tipo === "reparaciones" ? "Agregar reparación" : "Agregar repuesto").click();
  const campo = (tipo === "reparaciones" ? "costo-" : "cantidad-") + catalogo[numero - 1].id;
  await hasta(() => document.getElementById(campo));
}
async function paginar(tipo, texto) {
  botonCatalogo(tipo, texto).click();
  await pausa(15);
  await hasta(() => seccion(tipo).querySelector("[aria-busy]").getAttribute("aria-busy") === "false");
}
async function enviar() {
  document.querySelector("form").dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
  await pausa(20);
  await hasta(() => document.querySelector("form").getAttribute("aria-busy") === "false");
}
const texto = () => document.body.textContent;
async function probarInvalidacion(tipo) {
  await montar();
  await escribir("numero-presupuesto", "P-CONSERVADO");
  for (let numero = 1; numero <= 3; numero++) {
    await agregar("reparaciones", numero); await escribir("costo-" + id(numero), numero + ".00");
    await agregar("repuestos", numero); await escribir("cantidad-" + id(numero + 100), String(numero));
  }
  const otraColeccion = tipo === "reparaciones" ? "repuestos" : "reparaciones";
  const prefijo = tipo === "reparaciones" ? "costo-" : "cantidad-";
  const otroPrefijo = tipo === "reparaciones" ? "cantidad-" : "costo-";
  const desplazamiento = tipo === "reparaciones" ? 0 : 100;
  const otroDesplazamiento = tipo === "reparaciones" ? 100 : 0;
  const campo = tipo === "reparaciones" ? "costo" : "cantidad";
  const respuestaConErrores = indice => ({errorGeneral: "Revisá los campos indicados.", errores: {
    numeroPresupuesto: "Error de número que debe conservarse.",
    reparaciones: "Error general de reparaciones.",
    repuestos: "Error general de repuestos.",
    [tipo + "." + indice + "." + campo]: "Error de la colección modificada.",
    [otraColeccion + ".1." + (tipo === "reparaciones" ? "cantidad" : "costo")]: "Error de la otra colección.",
  }});
  respuesta = respuestaConErrores(1);
  await enviar();
  exigir(document.getElementById(prefijo + id(2 + desplazamiento)).getAttribute("aria-invalid") === "true", "Error original en B");
  exigir(document.getElementById(otroPrefijo + id(2 + otroDesplazamiento)).getAttribute("aria-invalid") === "true", "Error original de la otra colección");
  document.querySelector('[aria-label="Quitar ' + (tipo === "reparaciones" ? "reparación Reparación" : "repuesto Repuesto") + ' 1"]').click();
  await hasta(() => !document.getElementById(prefijo + id(1 + desplazamiento)));
  exigir(!seccion(tipo).querySelector('[aria-invalid="true"]'), "No desplaza el error a B ni a C después de quitar A");
  exigir(!seccion(tipo).textContent.includes("Error general"), "Invalida también el error general de la colección");
  exigir(document.getElementById(otroPrefijo + id(2 + otroDesplazamiento)).getAttribute("aria-invalid") === "true", "Conserva errores ajenos");
  exigir(seccion(otraColeccion).textContent.includes("Error general"), "Conserva error general de la otra colección");
  exigir(document.getElementById("numero-presupuesto").getAttribute("aria-invalid") === "true", "Conserva error del número");
  exigir(document.getElementById("numero-presupuesto").value === "P-CONSERVADO", "Conserva número ingresado");
  exigir(document.getElementById("costo-" + id(2)).value === "2.00" && document.getElementById("cantidad-" + id(102)).value === "2", "Conserva costos y cantidades");
  respuesta = respuestaConErrores(0);
  await enviar();
  exigir(document.getElementById(prefijo + id(2 + desplazamiento)).getAttribute("aria-invalid") === "true", "Vuelve a mostrar los errores de una nueva respuesta");
  await agregar(tipo, 4);
  exigir(!seccion(tipo).querySelector('[aria-invalid="true"]'), "Agregar también invalida sólo esta colección");
  exigir(document.getElementById(otroPrefijo + id(2 + otroDesplazamiento)).getAttribute("aria-invalid") === "true", "Agregar conserva errores de la otra colección");
  exigir(document.getElementById("costo-" + id(2)).value === "2.00" && document.getElementById("cantidad-" + id(102)).value === "2", "Agregar conserva datos");
}
const pruebas = [
  async () => {
    await montar();
    await escribir("numero-presupuesto", "P-PRUEBA");
    await agregar("reparaciones", 1); await escribir("costo-" + id(1), "0.10");
    await paginar("reparaciones", "Siguiente");
    exigir(lecturas[0].page === 2 && lecturas[0].limit === 10, "Consulta la segunda página");
    exigir(document.getElementById("costo-" + id(1)).value === "0.10", "Conserva la primera fila");
    await agregar("reparaciones", 11); await escribir("costo-" + id(11), "0.20");
    await paginar("repuestos", "Siguiente"); await agregar("repuestos", 11); await escribir("cantidad-" + id(111), "3");
    exigir(texto().includes("Total de reparaciones: 0.30"), "Total decimal exacto sin repuestos");
    await paginar("reparaciones", "Anterior");
    exigir(document.getElementById("costo-" + id(11)).value === "0.20", "Conserva selección fuera de página");
    await enviar();
    exigir(llamadas.length === 1, "Un único envío");
    const datos = llamadas[0].datos;
    exigir(llamadas[0].siniestroId === id(500) && datos.numeroPresupuesto === "P-PRUEBA", "ID asociado a la Action desde la página");
    exigir(!Object.hasOwn(datos, "siniestroId"), "El formulario no incluye el ID de URL en el payload editable");
    exigir(JSON.stringify(datos.reparaciones) === JSON.stringify([{reparacionId: id(1), costo: "0.10"}, {reparacionId: id(11), costo: "0.20"}]), "Envía todas las reparaciones y textos decimales");
    exigir(datos.repuestos[0].repuestoId === id(111) && datos.repuestos[0].cantidad === 3, "Envía cantidad entera");
  },
  async () => {
    await montar(); await escribir("numero-presupuesto", "DUPLICADO"); await agregar("reparaciones", 1); await escribir("costo-" + id(1), "1,00");
    respuesta = {errorGeneral: "Ya existe un presupuesto con ese número.", errores: {numeroPresupuesto: "Número duplicado.", "reparaciones.0.costo": "Usá punto y dos decimales."}};
    await enviar();
    const alerta = document.querySelector("form > [role=alert]");
    exigir(alerta.textContent.includes("Ya existe"), "Motivo de negocio concreto arriba del formulario");
    exigir(document.activeElement === alerta, "Foco en el rechazo");
    exigir(document.getElementById("numero-presupuesto").value === "DUPLICADO", "Conserva número");
    exigir(document.getElementById("costo-" + id(1)).value === "1,00", "Conserva costo sin transformar");
    exigir(document.getElementById("costo-" + id(1)).getAttribute("aria-invalid") === "true", "Error asociado a fila");
    exigir(texto().includes("Usá punto y dos decimales."), "Mensaje por fila visible");
  },
  async () => {
    await montar(); await escribir("numero-presupuesto", "P-PENDIENTE"); await agregar("reparaciones", 1); await escribir("costo-" + id(1), "0.00");
    diferir = true;
    const form = document.querySelector("form");
    form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
    form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
    await hasta(() => llamadas.length === 1 && form.getAttribute("aria-busy") === "true");
    exigir(document.querySelector('button[type="submit"]').textContent === "Guardando…", "Estado pendiente");
    exigir(document.getElementById("numero-presupuesto").matches(":disabled"), "Campos bloqueados");
    exigir(botonCatalogo("reparaciones", "Siguiente").matches(":disabled"), "Paginación bloqueada");
    form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
    exigir(llamadas.length === 1, "No duplica durante la Action");
    resolver({errores: {}, errorGeneral: "Falla simulada recuperable"});
    await hasta(() => form.getAttribute("aria-busy") === "false");
    exigir(!document.getElementById("numero-presupuesto").matches(":disabled"), "Habilita después del error");
  },
  async () => {
    const inicial = {id: id(900), numeroPresupuesto: "P-EXISTENTE", estado: "BORRADOR", siniestro: {id: id(500), numeroSiniestro: "SIN-1"}, total: "2.00",
      reparaciones: [{id: id(901), costo: "2.00", reparacion: reparaciones[10]}], repuestos: [{id: id(902), cantidad: 2, repuesto: repuestos[10]}]};
    await montar(inicial);
    exigir(document.getElementById("numero-presupuesto").readOnly, "Número inmutable");
    exigir(document.getElementById("costo-" + id(11)).value === "2.00", "Precarga selección fuera de primera página");
    await escribir("costo-" + id(11), "3.25"); await escribir("cantidad-" + id(111), "4");
    await enviar();
    const llamada = llamadas[0];
    exigir(llamada.modo === "editar" && llamada.presupuestoId === id(900), "Actualiza presupuesto correcto");
    exigir(Object.keys(llamada.datos).sort().join(",") === "reparaciones,repuestos", "No envía número, estado ni siniestro");
    exigir(llamada.datos.reparaciones[0].costo === "3.25", "Envía costo editado sin redondeo");
  },
  async () => {
    await montar(); await agregar("reparaciones", 1);
    exigir(document.querySelector('[aria-label="Quitar reparación Reparación 1"]').disabled, "No quita la última reparación");
    exigir([...document.getElementById("catalogo-reparaciones").options].find(o => o.value === id(1)).disabled, "No duplica reparación");
    await agregar("reparaciones", 2); document.querySelector('[aria-label="Quitar reparación Reparación 1"]').click();
    await hasta(() => !document.getElementById("costo-" + id(1)));
    await agregar("repuestos", 1); document.querySelector('[aria-label="Quitar repuesto Repuesto 1"]').click();
    await hasta(() => !document.getElementById("cantidad-" + id(101)));
    exigir(texto().includes("No incorporaste repuestos."), "Todos los repuestos son opcionales");
    await escribir("costo-" + id(2), "0.00"); await escribir("numero-presupuesto", "P-SIN-REPUESTOS"); await enviar();
    exigir(llamadas[0].datos.repuestos.length === 0, "Envía colección opcional vacía");
  },
  async () => {
    await montar(); await agregar("reparaciones", 1); await escribir("costo-" + id(1), "4.00");
    fallaCatalogo = true; await paginar("reparaciones", "Siguiente");
    exigir(texto().includes("No pudimos cargar el catálogo simulado."), "Falla visible");
    exigir(document.getElementById("costo-" + id(1)).value === "4.00", "Conserva la fila tras falla");
    fallaCatalogo = false; await paginar("reparaciones", "Siguiente"); await agregar("reparaciones", 11);
    exigir(document.getElementById("costo-" + id(1)).value === "4.00", "Conserva después del reintento");
  },
  async () => {
    await montar(undefined, true);
    exigir(texto().includes("No hay reparaciones disponibles"), "Catálogo vacío");
    respuesta = {errores: {reparaciones: "Agregá al menos una reparación.", repuestos: "Revisá los repuestos."}, errorGeneral: "Revisá los campos indicados."};
    await enviar(); exigir(texto().includes("Agregá al menos una reparación."), "Validación de reparación mínima");
    for (const tipo of ["reparaciones", "repuestos"]) {
      const grupo = seccion(tipo), error = document.getElementById("error-" + tipo);
      exigir(grupo.getAttribute("aria-describedby") === error.id, "Error asociado al grupo de " + tipo);
      const referencia = grupo.querySelector("select") ?? grupo.querySelector("h2");
      exigir(referencia.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING, "Error debajo del grupo de " + tipo);
    }
    await escribir("numero-presupuesto", "P-CORREGIDO"); exigir(document.getElementById("numero-presupuesto").value === "P-CORREGIDO", "Permite corregir");
  },
  async () => { await probarInvalidacion("reparaciones"); },
  async () => { await probarInvalidacion("repuestos"); },
  async () => {
    await montar(); await agregar("reparaciones", 1); await escribir("costo-" + id(1), "10.00");
    for (const input of document.querySelectorAll("input, select")) {
      exigir(document.querySelector('label[for="' + input.id + '"]'), "Etiqueta asociada " + input.id);
      if (!input.matches(":disabled")) { input.focus(); exigir(document.activeElement === input, "Control enfocable " + input.id); }
    }
    exigir(innerWidth === 375, "Viewport de 375 px");
    exigir(document.documentElement.scrollWidth <= innerWidth, "Sin desbordamiento horizontal");
  },
];
(async () => {
  const reportes = [];
  for (let i=0; i<pruebas.length; i++) {
    try {await pruebas[i](); reportes.push({nombre: nombres[i], error: null});}
    catch(error) {reportes.push({nombre: nombres[i], error: String(error)});}
    finally {if (resolver) {resolver({errores: {}}); resolver = undefined;}}
  }
  await fetch("/__resultado?datos=" + encodeURIComponent(JSON.stringify(reportes)));
})().catch(error => fetch("/__resultado?datos=" + encodeURIComponent(JSON.stringify([{nombre: "fixture", error: String(error)}]))));
`;
