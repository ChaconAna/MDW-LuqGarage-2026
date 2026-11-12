export const casosTransiciones = [
  "exige confirmación de ENVIADO y permite cancelar sin ejecutar ninguna Action",
  "permite confirmar aprobación o rechazo con el destino explícito",
  "registra envío, conserva el detalle y actualiza controles con datos del servidor",
  "registra aprobación y muestra el estado terminal sin acciones",
  "registra rechazo y muestra el estado terminal sin acciones",
  "comparte el bloqueo para envíos duplicados y operaciones opuestas",
  "muestra un conflicto concreto sin reintentar y permite una nueva confirmación",
  "maneja un fallo de transporte sin exponer detalles ni reintentar",
  "respeta un estado actualizado por otra sesión antes de confirmar",
  "mantiene controles accesibles, foco y presentación a 375 px",
] as const;

// React real; las Actions y las nuevas props del servidor se simulan, sin persistencia.
export const escenarioTransiciones = String.raw`
import React from "react";
import { createRoot } from "react-dom/client";
import Gestion from "@/components/presupuestos/GestionEstadoPresupuesto";

const root = createRoot(document.getElementById("root"));
const presupuestoId = "10000000-0000-4000-8000-000000000001";
const destinos = {envio: "ENVIADO", aprobacion: "APROBADO", rechazo: "RECHAZADO"};
const mensajes = {envio: "El envío externo del presupuesto quedó registrado.", aprobacion: "La respuesta externa de aprobación quedó registrada.", rechazo: "La respuesta externa de rechazo quedó registrada."};
let estadoServidor, llamadas, diferir, resolver, respuesta, fallaTransporte, montaje = 0;
const pausa = ms => new Promise(resolve => setTimeout(resolve, ms));
const exigir = (valor, mensaje) => {if (!valor) throw new Error(mensaje);};
async function hasta(condicion) {
  for (let i=0; i<400; i++) {if (condicion()) return; await pausa(10);}
  throw new Error("Tiempo agotado esperando el estado de la interfaz");
}
function render() {
  root.render(<main className="min-w-0 p-4">
    <p id="estado-servidor">Estado: {estadoServidor}</p>
    {estadoServidor === "BORRADOR" ? <a href="/presupuestos/editar">Editar borrador</a> : null}
    <Gestion key={montaje} presupuestoId={presupuestoId} estado={estadoServidor} />
  </main>);
}
async function registrar(operacion, id) {
  llamadas.push({operacion, id});
  if (fallaTransporte) throw new Error("detalle-tecnico-que-no-debe-mostrarse");
  if (diferir) return new Promise(resolve => {resolver = resolve;});
  if (respuesta) return respuesta;
  estadoServidor = destinos[operacion]; render();
  return {mensajeExito: mensajes[operacion]};
}
window.__registrarEnvio = id => registrar("envio", id);
window.__registrarAprobacion = id => registrar("aprobacion", id);
window.__registrarRechazo = id => registrar("rechazo", id);
async function montar(estado) {
  llamadas = []; diferir = false; resolver = undefined; respuesta = undefined; fallaTransporte = false;
  estadoServidor = estado; montaje++; render(); await pausa(20);
  await hasta(() => document.querySelector("form")?.getAttribute("aria-busy") === "false");
}
const texto = () => document.body.textContent;
const botones = () => [...document.querySelectorAll("button")];
const boton = etiqueta => botones().find(b => b.textContent === etiqueta);
async function elegir(etiqueta, destino) {
  const origen = boton(etiqueta); exigir(origen, "Existe " + etiqueta); origen.click();
  await hasta(() => boton("Confirmar " + destino) && document.activeElement === boton("Confirmar " + destino));
  exigir(document.querySelector('[role="group"]').textContent.includes(destino), "El destino se informa explícitamente");
  exigir(document.activeElement === boton("Confirmar " + destino), "Foco en confirmación");
}
async function confirmar(destino) {
  boton("Confirmar " + destino).click(); await pausa(20);
  await hasta(() => document.querySelector("form").getAttribute("aria-busy") === "false");
}
async function exito(origen, etiqueta, destino, operacion) {
  await montar(origen);
  const ruta = location.pathname;
  await elegir(etiqueta, destino); await confirmar(destino);
  await hasta(() => texto().includes(mensajes[operacion]) && !document.querySelector('[role="group"]'));
  exigir(llamadas.length === 1 && llamadas[0].operacion === operacion && llamadas[0].id === presupuestoId, "Invoca sólo la Action específica con el UUID");
  exigir(location.pathname === ruta, "Permanece en el detalle");
  exigir(document.getElementById("estado-servidor").textContent.includes(destino), "Estado proviene de las props actualizadas del servidor");
  exigir(!texto().includes("Editar borrador"), "No permite editar fuera de BORRADOR");
  exigir(document.activeElement.textContent === mensajes[operacion], "Foco en confirmación de éxito");
}
const pruebas = [
  async () => {
    await montar("BORRADOR");
    exigir(boton("Registrar envío externo") && !boton("Registrar aprobación") && !boton("Registrar rechazo"), "Controles de BORRADOR");
    exigir(texto().includes("fuera de LuqGarage"), "Aclara comunicación externa");
    document.querySelector("form").dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
    exigir(llamadas.length === 0, "No envía sin confirmar");
    const origen = boton("Registrar envío externo");
    await elegir("Registrar envío externo", "ENVIADO");
    exigir(llamadas.length === 0, "Abrir confirmación no persiste");
    boton("Cancelar").click(); await hasta(() => !document.querySelector('[role="group"]'));
    exigir(llamadas.length === 0 && estadoServidor === "BORRADOR", "Cancelar no modifica información");
    exigir(document.activeElement === origen, "Cancelar devuelve foco al origen");
  },
  async () => {
    await montar("ENVIADO");
    exigir(!boton("Registrar envío externo"), "No permite reenviar");
    await elegir("Registrar aprobación", "APROBADO");
    await elegir("Registrar rechazo", "RECHAZADO");
    exigir(!boton("Confirmar APROBADO"), "Sólo una confirmación activa");
    boton("Cancelar").click(); await hasta(() => !document.querySelector('[role="group"]'));
    exigir(llamadas.length === 0, "Elegir o cancelar no invoca Actions");
  },
  async () => {
    await exito("BORRADOR", "Registrar envío externo", "ENVIADO", "envio");
    exigir(boton("Registrar aprobación") && boton("Registrar rechazo") && !boton("Registrar envío externo"), "Controles actualizados para ENVIADO");
  },
  async () => {
    await exito("ENVIADO", "Registrar aprobación", "APROBADO", "aprobacion");
    exigir(botones().length === 0, "APROBADO sin transiciones");
  },
  async () => {
    await exito("ENVIADO", "Registrar rechazo", "RECHAZADO", "rechazo");
    exigir(botones().length === 0, "RECHAZADO sin transiciones");
  },
  async () => {
    await montar("ENVIADO"); await elegir("Registrar aprobación", "APROBADO"); diferir = true;
    const form = document.querySelector("form");
    form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
    form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
    await hasta(() => llamadas.length === 1 && form.getAttribute("aria-busy") === "true");
    exigir(texto().includes("Registrando aprobación…"), "Estado pendiente específico");
    exigir(botones().every(b => b.matches(":disabled")), "Bloqueo compartido de todos los controles");
    boton("Registrar rechazo").click(); boton("Cancelar").click();
    form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
    exigir(llamadas.length === 1 && llamadas[0].operacion === "aprobacion", "No duplica ni aprueba y rechaza simultáneamente");
    resolver({errorGeneral: "El presupuesto ya no está en ENVIADO. Actualizá el detalle para consultar su estado."});
    await hasta(() => form.getAttribute("aria-busy") === "false" && !document.querySelector('[role="group"]'));
    exigir(botones().every(b => !b.matches(":disabled")), "Desbloquea tras el resultado");
  },
  async () => {
    await montar("ENVIADO");
    respuesta = {errorGeneral: "El presupuesto ya no está en ENVIADO. Actualizá el detalle para consultar su estado."};
    await elegir("Registrar rechazo", "RECHAZADO"); await confirmar("RECHAZADO");
    await hasta(() => document.querySelector('[role="alert"]'));
    exigir(document.activeElement === document.querySelector('[role="alert"]'), "Foco en error superior");
    exigir(texto().includes(respuesta.errorGeneral), "Muestra el motivo concreto del conflicto");
    await pausa(50); exigir(llamadas.length === 1, "No reintenta automáticamente");
    exigir(!document.querySelector('[role="group"]'), "Requiere otra confirmación");
    respuesta = undefined;
    await elegir("Registrar rechazo", "RECHAZADO"); await confirmar("RECHAZADO");
    exigir(llamadas.length === 2 && estadoServidor === "RECHAZADO", "Permite una nueva operación explícita");
  },
  async () => {
    await montar("BORRADOR"); fallaTransporte = true;
    await elegir("Registrar envío externo", "ENVIADO"); await confirmar("ENVIADO");
    await hasta(() => document.querySelector('[role="alert"]'));
    exigir(texto().includes("No pudimos confirmar"), "Informa incertidumbre");
    exigir(!texto().includes("detalle-tecnico"), "No expone el error técnico");
    await pausa(50); exigir(llamadas.length === 1, "No reintenta un resultado incierto");
  },
  async () => {
    await montar("ENVIADO"); await elegir("Registrar aprobación", "APROBADO");
    estadoServidor = "APROBADO"; render(); await pausa(20);
    exigir(botones().length === 0, "Oculta confirmación obsoleta al actualizar props");
    document.querySelector("form").dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
    exigir(llamadas.length === 0, "No envía una confirmación cuyo origen ya no corresponde");
  },
  async () => {
    await montar("ENVIADO");
    for (const b of botones()) {b.focus(); exigir(document.activeElement === b, "Control nativo enfocable"); exigir(b.type === "button", "No dispara confirmación al abrir el paso");}
    await elegir("Registrar rechazo", "RECHAZADO");
    const grupo = document.querySelector('[role="group"]');
    exigir(document.getElementById(grupo.getAttribute("aria-labelledby")), "Confirmación con nombre accesible");
    exigir(document.getElementById(grupo.getAttribute("aria-describedby")), "Confirmación con descripción accesible");
    exigir(innerWidth === 375, "Viewport de 375 px");
    exigir(document.documentElement.scrollWidth <= innerWidth, "Sin desbordamiento horizontal");
  },
];
(async () => {
  const reportes = [];
  for (let i=0; i<pruebas.length; i++) {
    try {await pruebas[i](); reportes.push({nombre: nombres[i], error: null});}
    catch(error) {reportes.push({nombre: nombres[i], error: String(error)});}
    finally {if (resolver) {resolver({errorGeneral: "Prueba finalizada"}); resolver = undefined;}}
  }
  await fetch("/__resultado?datos=" + encodeURIComponent(JSON.stringify(reportes)));
})().catch(error => fetch("/__resultado?datos=" + encodeURIComponent(JSON.stringify([{nombre: "fixture", error: String(error)}]))));
`;
