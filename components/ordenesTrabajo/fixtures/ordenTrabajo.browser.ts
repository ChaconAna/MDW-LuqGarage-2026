export const casosFormulario = [
  "selecciona once opciones paginadas y envía UUID de presupuestos fuera de la página visible",
  "impide enviar una selección vacía",
  "bloquea duplicados y navegación de catálogo durante el envío y se habilita después",
  "conserva selecciones y muestra errores de negocio arriba y de selección junto al catálogo",
  "conserva la página y selección cuando falla la lectura del catálogo",
  "permite quitar una selección fuera de la página visible sin escribir",
  "comparte bloqueo entre carga del catálogo y creación",
  "asocia etiquetas a checkboxes nativos y permite foco por teclado",
  "mantiene el formulario utilizable a 375 px",
] as const;

export const escenarioFormulario = String.raw`
import React from "react";
import { createRoot } from "react-dom/client";
import Formulario from "./components/ordenesTrabajo/FormularioOrdenTrabajo";
const root = createRoot(document.getElementById("root"));
const id = n => "10000000-0000-4000-8000-" + String(n).padStart(12, "0");
const presupuestos = Array.from({length: 11}, (_, i) => ({id: id(i + 1), numeroPresupuesto: "P-" + (i + 1)}));
let llamadas = [], lecturas = [], respuesta, diferir, fallaCatalogo, diferirCatalogo, resolver, resolverCatalogo, montaje = 0;
const pausa = ms => new Promise(r => setTimeout(r, ms));
function exigir(condicion, mensaje) { if (!condicion) throw new Error(mensaje); }
async function hasta(condicion) { for (let i = 0; i < 300; i++) { if (condicion()) return; await pausa(10); } throw new Error("Espera agotada"); }
window.__crear = (siniestroId, _anterior, ids) => {
  llamadas.push({siniestroId, ids});
  return diferir ? new Promise(r => {resolver = r;}) : Promise.resolve(respuesta);
};
window.__catalogo = async (siniestroId, page) => {
  lecturas.push({siniestroId, page});
  if (diferirCatalogo) return new Promise(r => {resolverCatalogo = r;});
  if (fallaCatalogo) return {ok: false, error: "Error simulado de lectura del catálogo."};
  return {ok: true, presupuestos: presupuestos.slice((page - 1)*10, page*10), total: 11, pagina: page};
};
async function montar(vacio = false) {
  llamadas = []; lecturas = []; respuesta = {}; diferir = false; fallaCatalogo = false; diferirCatalogo = false;
  resolver = undefined; resolverCatalogo = undefined;
  root.render(<Formulario key={++montaje} siniestroId={id(500)} inicial={{presupuestos: vacio ? [] : presupuestos.slice(0, 10), total: vacio ? 0 : 11}} />);
  await pausa(20); await hasta(() => document.querySelector("form"));
}
const form = () => document.querySelector("form");
const texto = () => document.body.textContent;
const enviarEvento = () => form().dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
const boton = texto => [...document.querySelectorAll("button")].find(b => b.textContent === texto);
const check = n => document.getElementById("presupuesto-" + id(n));
async function seleccionar(n) { check(n).click(); await pausa(10); }
async function paginar(textoBoton) {
  boton(textoBoton).click(); await pausa(20);
  await hasta(() => form().getAttribute("aria-busy") === "false");
}
async function enviar() { enviarEvento(); await pausa(20); await hasta(() => form().getAttribute("aria-busy") === "false"); }
const reportes = [];
async function caso(indice, ejecutar) {
  try { await ejecutar(); reportes.push({nombre: nombres[indice], error: null}); }
  catch (error) { reportes.push({nombre: nombres[indice], error: error.message}); }
}
(async () => {
  await caso(0, async () => {
    await montar(); await seleccionar(1); await paginar("Siguiente");
    exigir(texto().includes("Página 2 de 2") && !check(1) && check(11), "Segunda página con opción once");
    exigir(boton("Siguiente").disabled, "No navega después de última");
    await seleccionar(11); await paginar("Anterior");
    exigir(check(1).checked && !check(11), "Conserva radio lógico al regresar");
    exigir(boton("Anterior").disabled && texto().includes("Selección (2)"), "Primera y resumen");
    await enviar();
    exigir(llamadas.length === 1 && llamadas[0].siniestroId === id(500), "Siniestro fijo");
    exigir(JSON.stringify(llamadas[0].ids) === JSON.stringify([id(1), id(11)]), "Envía ambas selecciones, incluso fuera de página");
    exigir(lecturas.every(l => l.siniestroId === id(500)), "Mantiene siniestro en el catálogo");
  });
  await caso(1, async () => {
    await montar(true); exigir(document.querySelector('[type="submit"]').disabled, "Botón deshabilitado sin selección");
    enviarEvento(); await pausa(20); exigir(llamadas.length === 0, "Guardia ante submit programático vacío");
    exigir(texto().includes("No hay presupuestos aprobados disponibles"), "Estado vacío");
  });
  await caso(2, async () => {
    await montar(); await seleccionar(1); diferir = true;
    enviarEvento(); enviarEvento();
    await hasta(() => llamadas.length === 1 && form().getAttribute("aria-busy") === "true");
    exigir(document.querySelector("fieldset").disabled && check(1).matches(":disabled"), "Checkbox y fieldset nativamente deshabilitados");
    exigir(document.querySelector('[type="submit"]').matches(":disabled"), "Envío deshabilitado");
    exigir(texto().includes("Creando…"), "Estado pendiente visible");
    boton("Siguiente").click(); check(2).click(); enviarEvento();
    await pausa(20); exigir(llamadas.length === 1 && lecturas.length === 0 && !check(2).checked, "No duplica ni pagina ni cambia selección");
    resolver({errorGeneral: "Conflicto simulado."});
    await hasta(() => form().getAttribute("aria-busy") === "false");
    exigir(!check(1).matches(":disabled") && check(1).checked, "Rehabilitado conservando selección");
    diferir = false; await enviar(); exigir(llamadas.length === 2, "Permite intento explícito posterior");
  });
  await caso(3, async () => {
    await montar(); await seleccionar(1); await paginar("Siguiente"); await seleccionar(11);
    respuesta = {errorGeneral: "Otro proceso ya asoció un presupuesto.", errorSeleccion: "Revisá la selección indicada."};
    await enviar();
    const alerta = form().querySelector('[role="alert"]');
    exigir(alerta.textContent === respuesta.errorGeneral && alerta.compareDocumentPosition(document.querySelector("fieldset")) & Node.DOCUMENT_POSITION_FOLLOWING, "Error de negocio arriba del catálogo");
    exigir(document.getElementById("error-presupuestos").textContent === respuesta.errorSeleccion, "Error junto a selección");
    exigir(check(11).checked && texto().includes("Selección (2)"), "Conserva todas las selecciones");
    await paginar("Anterior"); exigir(check(1).checked, "También conserva opción fuera de página");
    exigir(document.activeElement === alerta, "Error general recibe foco");
    await seleccionar(2); exigir(!document.getElementById("error-presupuestos"), "Descarta error de selección al cambiarla");
    await enviar(); exigir(document.getElementById("error-presupuestos"), "Muestra nuevo error de otro intento");
  });
  await caso(4, async () => {
    await montar(); await seleccionar(1); fallaCatalogo = true; await paginar("Siguiente");
    exigir(texto().includes("Error simulado de lectura") && check(1).checked && !check(11), "Conserva página y selección ante lectura fallida");
    exigir(form().getAttribute("aria-busy") === "false", "Permite reintentar");
  });
  await caso(5, async () => {
    await montar(); await seleccionar(1); await paginar("Siguiente"); await seleccionar(11);
    document.querySelector('[aria-label="Quitar de la selección el presupuesto P-1"]').click(); await pausa(15);
    exigir(texto().includes("Selección (1)") && check(11).checked && llamadas.length === 0, "Quita sólo selección local fuera de página");
    await enviar(); exigir(JSON.stringify(llamadas[0].ids) === JSON.stringify([id(11)]), "No envía presupuesto quitado");
  });
  await caso(6, async () => {
    await montar(); await seleccionar(1); diferirCatalogo = true; boton("Siguiente").click(); enviarEvento(); boton("Siguiente").click();
    await hasta(() => lecturas.length === 1 && form().getAttribute("aria-busy") === "true");
    exigir(llamadas.length === 0 && lecturas.length === 1, "Bloqueo compartido desde el mismo evento");
    resolverCatalogo({ok: true, presupuestos: presupuestos.slice(10), total: 11, pagina: 2});
    await hasta(() => form().getAttribute("aria-busy") === "false"); await enviar(); exigir(llamadas.length === 1, "Desbloquea al terminar catálogo");
  });
  await caso(7, async () => {
    await montar(); const control = check(1);
    exigir(control.type === "checkbox" && control.labels.length === 1 && control.tabIndex === 0, "Checkbox nativo etiquetado y en orden de teclado");
    control.focus(); exigir(document.activeElement === control, "Recibe foco");
    control.labels[0].click(); await pausa(10); exigir(control.checked, "Etiqueta activa el control");
    exigir(document.querySelector("legend") && control.getAttribute("aria-describedby") === "ayuda-presupuestos", "Grupo y ayuda asociados");
    exigir([...document.querySelectorAll("button")].every(b => b.tabIndex === 0), "Botones en orden nativo");
  });
  await caso(8, async () => {
    await montar(); await seleccionar(1);
    exigir(innerWidth === 375, "Viewport de 375 px");
    exigir(document.documentElement.scrollWidth <= innerWidth, "Sin desbordamiento horizontal");
    for (const control of document.querySelectorAll('input, button')) {
      const rect = control.getBoundingClientRect();
      exigir(rect.width > 0 && rect.left >= 0 && rect.right <= innerWidth, "Controles dentro del viewport");
    }
  });
  fetch("/__resultado?datos=" + encodeURIComponent(JSON.stringify(reportes)));
})();
`;
