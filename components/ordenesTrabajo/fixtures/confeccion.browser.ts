export const casosFormulario = [
  "incorpora presupuestos paginados conservando selección y actualiza tareas, sectores y observaciones",
  "guarda sólo observaciones modificadas y limpia con null sin alterar otros sectores",
  "impide incorporar o finalizar con textos sin guardar y permite descartarlos",
  "conserva textos y muestra errores de observaciones junto al formulario",
  "solicita confirmación y cancela sin escribir devolviendo el foco",
  "finaliza con el detalle confirmado y retira todos los controles de edición",
  "muestra rechazo de composición sin anunciar éxito ni retirar controles",
  "bloquea duplicados y operaciones opuestas durante observaciones pendientes",
  "bloquea observaciones y finalización durante incorporación pendiente",
  "bloquea operaciones opuestas y confirmaciones duplicadas durante finalización",
  "comparte bloqueo con la paginación del catálogo y conserva valores ante fallos de transporte",
  "presenta etiquetas nativas y controles de confirmación accesibles",
  "mantiene controles y textos utilizables a 375 px",
] as const;

export const escenarioFormulario = String.raw`
import React from "react";
import { createRoot } from "react-dom/client";
import Confeccion from "./components/ordenesTrabajo/ConfeccionOrdenTrabajo";
const root = createRoot(document.getElementById("root"));
const id = n => "10000000-0000-4000-8000-" + String(n).padStart(12, "0");
const candidatos = Array.from({length: 11}, (_, i) => ({id: id(i + 2), numeroPresupuesto: "P-" + (i + 2)}));
const inicial = () => ({id: id(50), estado: "BORRADOR", siniestro: {id: id(60), numeroSiniestro: "SIN-1"}, presupuestos: [{id: id(1), numeroPresupuesto: "P-1", estado: "APROBADO"}], sectores: [
  {id: id(100), nombre: "Pintura", observacion: "Conservar", reparaciones: [{detalleReparacionId: id(200), presupuestoId: id(1), reparacion: {id: id(300), nombre: "Tarea original"}}]},
  {id: id(101), nombre: "Preparación", observacion: "Otra intacta", reparaciones: []},
]});
let llamadas, lecturas, respuesta, diferir, resolver, fallaTransporte, diferirCatalogo, resolverCatalogo, montaje = 0, ordenServidor;
const pausa = ms => new Promise(r => setTimeout(r, ms));
function exigir(c, mensaje) {if (!c) throw new Error(mensaje);}
async function hasta(c) {for(let i=0;i<300;i++){if(c())return;await pausa(10);}throw new Error("Espera agotada");}
const catalogo = () => {const disponibles = candidatos.filter(p => !ordenServidor.presupuestos.some(actual => actual.id === p.id)); return {presupuestos: disponibles.slice(0, 10), total: disponibles.length};};
function refrescar(orden) { ordenServidor = structuredClone(orden); root.render(<Confeccion key={montaje} inicialOrden={ordenServidor} catalogoInicial={catalogo()} />); }
function registrar(tipo, ot, datos) {
  llamadas.push({tipo, ot, datos});
  if (fallaTransporte) return Promise.reject(new Error("Transporte simulado"));
  return diferir ? new Promise(r => {resolver = r;}) : Promise.resolve(respuesta).then(resultado => {
    if (resultado.ordenTrabajo) setTimeout(() => refrescar(resultado.ordenTrabajo), 10);
    return resultado;
  });
}
window.__incorporar = (ot, datos) => registrar("incorporar", ot, datos);
window.__observar = (ot, datos) => registrar("observar", ot, datos);
window.__finalizar = ot => registrar("finalizar", ot);
window.__catalogo = async (sin, pagina) => {
  lecturas.push({sin, pagina});
  const resultado = {ok: true, presupuestos: candidatos.slice((pagina-1)*10, pagina*10), total: 11, pagina};
  return diferirCatalogo ? new Promise(r => {resolverCatalogo = () => r(resultado);}) : resultado;
};
async function montar() {
  llamadas=[]; lecturas=[]; respuesta={}; diferir=false; fallaTransporte=false; diferirCatalogo=false; resolver=undefined; resolverCatalogo=undefined;
  montaje++; refrescar(inicial()); await pausa(25); await hasta(() => document.querySelector('form[aria-label="Guardar observaciones"]'));
}
const texto = () => document.body.textContent;
const formulario = nombre => document.querySelector('form[aria-label="' + nombre + '"]');
const obs = () => formulario("Guardar observaciones");
const inc = () => formulario("Incorporar presupuestos");
const fin = () => formulario("Finalizar orden de trabajo");
const boton = nombre => [...document.querySelectorAll("button")].find(b => b.textContent === nombre);
const textarea = () => document.getElementById("observacion-" + id(100));
const seleccionar = n => document.getElementById("presupuesto-" + id(n)).click();
const submit = f => f.dispatchEvent(new Event("submit", {bubbles:true, cancelable:true}));
async function escribir(valor) {
  const control = textarea(); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(control,valor);
  control.dispatchEvent(new Event("input",{bubbles:true})); await pausa(10);
}
async function enviar(f) {submit(f);await pausa(30);await hasta(()=>!document.querySelector('[aria-busy="true"]'));}
async function pagina(nombre) {boton(nombre).click();await pausa(20);await hasta(()=>!document.querySelector('[aria-busy="true"]'));}
function presupuestoAgregado() {
  const orden=inicial(); orden.presupuestos.push({id:id(2),numeroPresupuesto:"P-2",estado:"APROBADO"},{id:id(12),numeroPresupuesto:"P-12",estado:"APROBADO"});
  orden.sectores.push({id:id(102),nombre:"Armado",observacion:null,reparaciones:[{detalleReparacionId:id(201),presupuestoId:id(12),reparacion:{id:id(301),nombre:"Tarea nueva"}}]});
  return orden;
}
const reportes=[];
async function caso(i, probar){try{await probar();reportes.push({nombre:nombres[i],error:null});}catch(e){reportes.push({nombre:nombres[i],error:e.message});}}
(async()=>{
  await caso(0,async()=>{
    await montar(); seleccionar(2);await pausa(10);await pagina("Siguiente");seleccionar(12);await pausa(10);
    exigir(texto().includes("Selección (2)"),"Selección entre páginas");
    respuesta={mensajeExito:"Presupuestos incorporados.",ordenTrabajo:presupuestoAgregado()}; await enviar(inc());
    exigir(JSON.stringify(llamadas[0].datos.presupuestoIds)===JSON.stringify([id(2),id(12)]),"UUID fuera de página incluido");
    exigir(llamadas[0].ot===id(50),"UUID de OT fijo");
    exigir(texto().includes("Tarea original")&&texto().includes("Tarea nueva")&&texto().includes("Procedencia: Presupuesto P-12"),"Detalle actualizado con procedencia");
    exigir(texto().includes("Observación: Conservar")&&document.getElementById("observacion-"+id(102)),"Conserva observación y muestra nuevo sector");
    exigir(texto().includes("Selección (0)")&&!document.getElementById("presupuesto-"+id(2)),"Reinicia selección y refresca catálogo disponible");
  });
  await caso(1,async()=>{
    await montar();await escribir("Nueva nota");const actualizada=inicial();actualizada.sectores[0].observacion="Nueva nota";
    respuesta={mensajeExito:"Observaciones guardadas.",ordenTrabajo:actualizada};await enviar(obs());
    exigir(JSON.stringify(llamadas[0].datos)==JSON.stringify({sectores:[{sectorId:id(100),observacion:"Nueva nota"}]}),"Envía sólo sector modificado");
    exigir(textarea().value==="Nueva nota"&&document.getElementById("observacion-"+id(101)).value==="Otra intacta","Valores confirmados sin borrar otro sector");
    await escribir("");const limpia=structuredClone(actualizada);limpia.sectores[0].observacion=null;respuesta={mensajeExito:"Observación eliminada.",ordenTrabajo:limpia};await enviar(obs());
    exigir(llamadas[1].datos.sectores[0].observacion===null,"Vacío se envía como null");exigir(textarea().value==="","Control vacío confirmado");
  });
  await caso(2,async()=>{
    await montar();seleccionar(2);await pausa(10);await escribir("Sin guardar");
    exigir(boton("Incorporar presupuestos").matches(":disabled")&&boton("Finalizar orden de trabajo").matches(":disabled"),"Protección nativa");
    exigir(inc().getAttribute("aria-busy")==="false","Bloquear por cambios locales no anuncia una operación pendiente");
    submit(inc());submit(fin());await pausa(20);exigir(llamadas.length===0,"Protección ante envío programático");
    boton("Descartar cambios").click();await pausa(15);
    exigir(textarea().value==="Conservar"&&!boton("Incorporar presupuestos").matches(":disabled")&&!boton("Finalizar orden de trabajo").matches(":disabled"),"Descarte rehabilita sin escribir");
    exigir(document.getElementById("presupuesto-"+id(2)).checked,"No pierde selección al descartar textos");
  });
  await caso(3,async()=>{
    await montar();await escribir("Texto conservado");respuesta={errorGeneral:"El sector ya no pertenece.",errorObservaciones:"Revisá las observaciones."};await enviar(obs());
    exigir(textarea().value==="Texto conservado"&&texto().includes(respuesta.errorGeneral),"Texto conservado y rechazo visible");
    exigir(document.getElementById("error-observaciones")&&textarea().getAttribute("aria-invalid")==="true","Error junto al formulario y asociado al control");
    exigir(boton("Finalizar orden de trabajo").matches(":disabled"),"Protección continúa después del error");
  });
  await caso(4,async()=>{
    await montar();submit(fin());await pausa(10);exigir(llamadas.length===0,"No finaliza sin confirmación");
    boton("Finalizar orden de trabajo").click();await pausa(15);exigir(texto().includes("Confirmar estado FINALIZADA")&&texto().includes("No representa la ejecución física"),"Explicación y destino explícitos");
    boton("Cancelar").click();await pausa(10);exigir(llamadas.length===0&&!boton("Confirmar FINALIZADA"),"Cancelación no escribe");
    exigir(document.activeElement===boton("Finalizar orden de trabajo"),"Devuelve foco");
  });
  await caso(5,async()=>{
    await montar();const final=inicial();final.estado="FINALIZADA";respuesta={mensajeExito:"Confección FINALIZADA.",ordenTrabajo:final};
    boton("Finalizar orden de trabajo").click();await pausa(10);await enviar(fin());
    exigir(llamadas.length===1&&llamadas[0].tipo==="finalizar","Sólo operación finalización");
    exigir(texto().includes("Estado: FINALIZADA")&&texto().includes("Confección FINALIZADA."),"Estado y confirmación del servidor");
    exigir(document.querySelectorAll("form,textarea,input").length===0,"Retira todos los controles de escritura");
  });
  await caso(6,async()=>{
    await montar();respuesta={errorGeneral:"Hay reparaciones sin sectorizar."};boton("Finalizar orden de trabajo").click();await pausa(10);await enviar(fin());
    exigir(texto().includes(respuesta.errorGeneral)&&texto().includes("Estado: BORRADOR")&&textarea(),"No anuncia finalización ante rechazo");
  });
  await caso(7,async()=>{
    await montar();seleccionar(2);await pausa(10);await escribir("Pendiente");diferir=true;submit(obs());submit(obs());
    await hasta(()=>llamadas.length===1&&document.querySelector('[aria-busy="true"]'));submit(inc());submit(fin());await pausa(15);
    exigir(llamadas.length===1&&textarea().matches(":disabled")&&boton("Finalizar orden de trabajo").matches(":disabled"),"Bloqueo compartido con observaciones");
    resolver({errorGeneral:"Conflicto al guardar."});await hasta(()=>!document.querySelector('[aria-busy="true"]'));
    exigir(textarea().value==="Pendiente"&&!textarea().matches(":disabled"),"Conserva texto y rehabilita edición");
  });
  await caso(8,async()=>{
    await montar();seleccionar(2);await pausa(10);diferir=true;submit(inc());submit(inc());
    await hasta(()=>llamadas.length===1&&document.querySelector('[aria-busy="true"]'));
    submit(obs());submit(fin());await pausa(15);
    exigir(llamadas.length===1&&textarea().matches(":disabled")&&boton("Finalizar orden de trabajo").matches(":disabled"),"Incorporación excluye operaciones opuestas");
    resolver({errorGeneral:"Presupuesto ocupado por otra OT."});await hasta(()=>!document.querySelector('[aria-busy="true"]'));
    exigir(document.getElementById("presupuesto-"+id(2)).checked&&texto().includes("Presupuesto ocupado"),"Conserva selección ante conflicto");
  });
  await caso(9,async()=>{
    await montar();seleccionar(2);await pausa(10);boton("Finalizar orden de trabajo").click();await pausa(10);diferir=true;submit(fin());submit(fin());
    await hasta(()=>llamadas.length===1&&document.querySelector('[aria-busy="true"]'));submit(inc());await escribir("No debe entrar");
    exigir(llamadas.length===1&&boton("Cancelar").matches(":disabled")&&boton("Incorporar presupuestos").matches(":disabled"),"No duplica ni cambia operación durante finalización");
    resolver({errorGeneral:"La orden ya no está en BORRADOR."});await hasta(()=>!document.querySelector('[aria-busy="true"]'));
    exigir(texto().includes("ya no está en BORRADOR")&&texto().includes("Estado: BORRADOR"),"Conflicto visible sin éxito optimista");
  });
  await caso(10,async()=>{
    await montar();seleccionar(2);await pausa(10);diferirCatalogo=true;boton("Siguiente").click();submit(inc());
    await hasta(()=>lecturas.length===1&&document.querySelector('[aria-busy="true"]'));
    exigir(llamadas.length===0&&textarea().matches(":disabled"),"Bloquea desde el inicio de lectura");resolverCatalogo();await hasta(()=>!document.querySelector('[aria-busy="true"]'));
    await escribir("Conservar ante transporte");fallaTransporte=true;await enviar(obs());
    exigir(textarea().value==="Conservar ante transporte"&&texto().includes("No pudimos confirmar"),"Error de transporte conserva texto y no anuncia éxito");
  });
  await caso(11,async()=>{
    await montar();exigir(textarea().labels.length===1&&textarea().tabIndex===0,"Textarea etiquetada y nativa");
    textarea().focus();exigir(document.activeElement===textarea(),"Foco disponible");boton("Finalizar orden de trabajo").click();await pausa(15);
    exigir(document.activeElement===boton("Confirmar FINALIZADA")&&document.querySelector('[aria-labelledby="confirmar-finalizacion"]'),"Confirmación enfocada y nombrada");
  });
  await caso(12,async()=>{
    await montar();await escribir("Texto largo de observación que debe conservarse dentro de la pantalla ".repeat(10));
    exigir(innerWidth===375&&document.documentElement.scrollWidth<=innerWidth,"Sin desborde horizontal a 375 px");
    for(const control of document.querySelectorAll("input,textarea,button")){const r=control.getBoundingClientRect();exigir(r.width>0&&r.left>=0&&r.right<=innerWidth,"Control utilizable dentro del viewport");}
  });
  fetch("/__resultado?datos="+encodeURIComponent(JSON.stringify(reportes)));
})();
`;
