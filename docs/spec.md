# LuqGarage — Specification

## 1. Descripción

LuqGarage es un sistema de gestión para un taller de reparación de vehículos que permite centralizar la información y gestionar el proceso asociado a:

- Siniestros.
- Presupuestos.
- Órdenes de Trabajo.

Este `spec.md` define las funcionalidades correspondientes a las tres primeras iteraciones del sistema:

1. Registrar Siniestro.
2. Registrar Presupuesto.
3. Generar Orden de Trabajo.

Las funcionalidades posteriores quedan fuera del alcance de esta versión.

---

## 2. Actores

### 2.1. Recepcionista

Responsable de gestionar los siniestros, aseguradoras, clientes y vehiculos
y actualizar estados del presupuesto segun respuesta de la aseguradora

Actualmente, la gestión de las autorizaciones de las aseguradoras se realiza manualmente y fuera del sistema.

### 2.2. Encargado del taller

Responsable de:

- Registrar Presupuesto.
- Generar Órdenes de Trabajo.

Permisos para:
- Gestionar Modulo de Seguridad
- Acceso completo al sistema.


## 3. Entidades

Las entidades involucradas en estas iteraciones son:
- Aseguradora
- Cliente
- DetalleDeReparacion
- DetalleDeRepuesto
- EstadoSiniestro
- GradoDelDanio
- Localidad
- Licencia
- Marca
- Modelo
- OrdenDeTrabajo
- OrdenTrabajoSector
- Presupuesto
- Provincia
- Reparacion
- Repuesto
- Sector
- Siniestro
- TipoLicencia
- TipoVehiculo
- Vehículo


# 4. Iteración 1 — Registrar Siniestro

## 4.1. Actor

Recepcionista.

## 4.2. Objetivo

Registrar un nuevo siniestro asociado a un cliente, un vehículo y una aseguradora.

## 4.3. Precondiciones

- El usuario debe estar autenticado.
- El usuario debe tener permisos para registrar siniestros.

## 4.4. Datos del cliente

El sistema debe permitir seleccionar un cliente y recuperar sus datos almacenados.

Datos:

- Nombre
- Apellido
- DNI
- Teléfono
- Email
- Dirección
- Localidad
- Provincia

Al seleccionar el cliente, los datos correspondientes deben completarse automáticamente.

## 4.5. Datos del vehículo

El sistema debe permitir registrar o seleccionar:

- Patente
- Marca
- Modelo
- Tipo de vehículo:
  - Automotor
  - Motocicleta
- Tipo de licencia:
  - A1
  - A2
  - B1
  - B2


## 4.6. Datos del siniestro

El sistema debe permitir registrar:

- Número de siniestro
- Fecha del siniestro
- Grado del daño:
  - Leve
  - Moderado
  - Grave
- Número de póliza
- Aseguradora
- Estado de la licencia
- Foto de la denuncia
- Foto lateral derecha
- Foto lateral izquierda
- Foto frontal
- Foto trasera
- Foto del certificado de cobertura
- Fotos extras, opcionales

El estado de la licencia se obtiene automáticamente.

## 4.7. Validaciones

El sistema debe validar:

- La fecha del siniestro no puede ser posterior a la fecha de registro.
- El seguro debe estar vigente al momento del siniestro.
- La licencia debe estar vigente al momento del siniestro.
- El número de siniestro no puede estar registrado previamente.
- Los campos obligatorios deben estar completos.


## 4.8. Acciones

### Confirmar Registro

Guarda el siniestro si las validaciones son correctas.

El siniestro queda en estado:

`Registrado`

### Cancelar

Cancela el registro sin guardar la información.



# 5. Estado del Siniestro

El siniestro posee los siguientes estados:


 Registrado - una vez que se registra
 Presupuestado - una vez que se crea un presupuesto
 PendienteDeFacturacion - cuando se finaliza la orden de trabajo 
 PendienteDePago - cuando se genra la factura
 Cerrado - una vez que se genero el recibo de pago 

5.1. Transiciones
Evento	Estado
Se registra el siniestro	Registrado
Se registra un presupuesto	Presupuestado
Se finaliza la Orden de Trabajo	PendienteDeFacturacion
Se genera la factura	PendienteDePago
Se genera el recibo de pago	Cerrado

Las dos últimas transiciones corresponden a funcionalidades posteriores que por el momento se seguiran haciendo fuera del sistema

6. Iteración 2 — Registrar Presupuesto
6.1. Actor

Encargado del taller.

6.2. Objetivo

Registrar un presupuesto asociado a un siniestro, incluyendo las reparaciones y repuestos necesarios.

6.3. Precondiciones
El usuario debe estar autenticado.
El usuario debe tener permisos para gestionar presupuestos.
Debe existir un siniestro registrado.
6.4. Selección del siniestro

El sistema debe permitir seleccionar un número de siniestro desde una lista desplegable.

Al seleccionar el siniestro, el sistema debe recuperar:

Cliente
Vehículo
Patente
Marca
Modelo
Aseguradora
6.5. Reparaciones

El Encargado debe poder seleccionar reparaciones desde una lista.

Cada reparación se incorpora al presupuesto mediante la acción Agregar.

Cada reparación debe permitir registrar su costo.

6.6. Repuestos

El Encargado debe poder seleccionar repuestos desde una lista.

Cada repuesto se incorpora al presupuesto mediante la acción Agregar.

Debe poder registrarse la unidad correspondiente.

6.7. Acciones
- Guardar

Guarda el presupuesto en estado:

- Borrador

El presupuesto no se envía a la aseguradora.

- Cancelar

Cancela la operación sin guardar el presupuesto.

- Confirmar

Confirma el presupuesto enviandolo a la aseguradora.

6.8. Estados del Presupuesto

El presupuesto contempla los siguientes estados:

Borrador
enviado  hasta obtener respuesta de la aseguradora



Para generar una Orden de Trabajo, el presupuesto debe encontrarse en estado:

enviado y con respuesta de la aseguradora aprobado  

7. Iteración 3 — Generar Orden de Trabajo
7.1. Actor

Encargado del taller.

7.2. Objetivo

Generar una Orden de Trabajo a partir de un presupuesto aprobado, organizando las tareas de reparación por sectores.

7.3. Precondiciones
El usuario debe estar autenticado.
El usuario debe tener permisos para gestionar Órdenes de Trabajo.
Debe existir al menos un presupuesto con respuesta de la aseguradora aprobado
7.4. Selección del siniestro

El Encargado debe seleccionar un número de siniestro.

El sistema debe recuperar automáticamente:

Presupuesto aprobado
Cliente
Patente
Marca
Modelo

La fecha de inicio y la fecha de fin se cargan automaticamente

7.5. Sectores

Los sectores se habilitan de acuerdo con las reparaciones existentes en el presupuesto.

Sectores:

Desarme
Reparación
Preparación
Pintura
Armado
Terminado

7.6. Tareas de reparación

Las tareas de la Orden de Trabajo provienen de las reparaciones cargadas previamente en el presupuesto.

El Encargado puede:

Visualizar las tareas.

El Encargado no puede agregar nuevas tareas de reparación desde la Orden de Trabajo.

7.7. Observaciones

Cada sector debe disponer de un campo opcional de observaciones.

El Encargado puede agregar observaciones relacionadas con los trabajos de cada sector.

7.8. Acciones

- Guardar 
Se  guardan los datos cargados hasta el momento aunque no esten los campos obligartorios completos y el estado de la orden queda en borrador

- Finalizar
Si todos los campos obligatorios estan completos la orden de trabajo queda en estado finalizada

Al finalizar la Orden de Trabajo, el siniestro pasa 

PendienteDeFacturacion

7.9 Estados de la Orden de Trabajo

La Orden de Trabajo posee los siguientes estados:

Borrador
Finalizada

8. Reglas de negocio

RN01 — Número de siniestro único

No se puede registrar un siniestro si el número de siniestro ya existe.

RN02 — Fecha del siniestro

La fecha del siniestro no puede ser posterior a la fecha de registro.

RN03 — Vigencia del seguro

El seguro debe estar vigente al momento del siniestro.

RN04 — Vigencia de licencia

La licencia debe estar vigente al momento del siniestro.

RN05 — Presupuesto asociado

Todo presupuesto debe estar asociado a un siniestro existente.

RN06 — Presupuesto aprobado

Solo se puede generar una Orden de Trabajo cuando existe al menos un presupuesto aprobado asociado al siniestro.

RN07 — Tareas de la Orden de Trabajo

Las tareas de la Orden de Trabajo provienen del presupuesto.

No se pueden agregar nuevas tareas desde la Orden de Trabajo.

RN08 — Observaciones

El Encargado puede agregar observaciones por sector.

RN09 — Finalización de la Orden de Trabajo

La Orden de Trabajo puede finalizarse cuando el Encargado verifica que la información necesaria está completa.

RN10 — Estado del siniestro

Al finalizar la Orden de Trabajo, el siniestro pasa a PendienteDeFacturacion.

RN11 — Autorizaciones

Durante estas iteraciones, las respuestas de las aseguradoras se gestionan manualmente por la Recepcionista y no forman parte del sistema.

10. Requisitos no funcionales
RNF01 — Autenticación y autorización

Solo los usuarios autorizados pueden acceder a las funcionalidades correspondientes mediante usuario y contraseña.

RNF02— Usabilidad

La interfaz debe ser intuitiva y requerir una capacitación mínima.

RNF03 — Claridad

La información presentada debe ser clara, consistente y fácil de interpretar.

RNF04 — Persistencia

Ante un error del sistema o pérdida de conexión, los datos cargados parcialmente deben mantenerse como borrador para evitar su pérdida.

RNF05 — APIs externas

El sistema debe contemplar la integración con APIs externas para:

Verificación del estado de la licencia de conducir.
TODO VER ENDPOINT

11. Fuera de alcance

Quedan fuera del alcance de estas iteraciones:

Modulo para particulares
Gestión de stock e inventario.
Facturación.
Registro de pagos.
Generación de recibos.
Seguimiento del avance de las tareas.
Reportes y estadísticas.
Lectura automática de emails de aseguradoras.
Gestión automática de autorizaciones mediante correo electrónico.
Cálculo de costos dentro de una Orden de Trabajo.

12. Flujo general
                 RECEPCIONISTA
                       │
                       ▼
               Registrar Siniestro
                       │
                       ▼
                Siniestro: Registrado
                       │
                       ▼
              ENCARGADO DEL TALLER
                       │
                       ▼
              Registrar Presupuesto
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
          Borrador            Confirmar
                                 │
                                 ▼
                    Respuesta aseguradora
                                 │
                              Aprobado
                                 │
                                 ▼
                    Generar Orden de Trabajo
                                 │
                                 ▼
                       Asociar sectores
                                 │
                                 ▼
                     Agregar observaciones
                          (opcional)
                                 │
                       ┌─────────┴─────────┐
                       ▼                   ▼
                    Borrador            Finalizar
                                           │
                                           ▼
                                      OT: Finalizada
                                           │
                                           ▼
                                Siniestro:
                                PendienteDeFacturacion