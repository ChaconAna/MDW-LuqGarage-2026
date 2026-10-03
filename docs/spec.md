# LuqGarage — Especificación funcional del MVP

## 1. Descripción

**LuqGarage** es un sistema de gestión para un taller de chapa y pintura orientado al trabajo con compañías aseguradoras.

El sistema busca centralizar la información actualmente gestionada de forma manual y descentralizada, reduciendo errores de registro, demoras y dificultades para realizar el seguimiento administrativo de los trabajos.

El MVP comprende tres procesos principales:

1. Registro de siniestros.
2. Gestión de presupuestos.
3. Generación de órdenes de trabajo.

El flujo funcional del MVP finaliza con la generación de la Orden de Trabajo. La ejecución y seguimiento de las reparaciones dentro del taller quedan fuera del alcance de esta versión.



# 2. Alcance del MVP

El sistema permitirá:

- Gestionar clientes.
- Gestionar vehículos.
- Gestionar aseguradoras.
- Registrar siniestros.
- Adjuntar documentación y fotografías a los siniestros.
- Registrar presupuestos asociados a siniestros.
- Incorporar reparaciones y repuestos a los presupuestos.
- Enviar presupuestos a una aseguradora mediante email.
- Procesar la respuesta recibida por email.
- Aprobar o rechazar automáticamente un presupuesto según dicha respuesta.
- Generar una Orden de Trabajo utilizando uno o varios presupuestos aprobados pertenecientes al mismo siniestro.
- Organizar las reparaciones de la Orden de Trabajo por sectores.
- Consultar las Órdenes de Trabajo generadas.
- Gestionar usuarios y permisos.

El sistema será implementado inicialmente como backend y deberá permitir ejecutar el flujo completo mediante requests HTTP, sin requerir una interfaz gráfica.



# 3. Actores y roles

## 3.1. Recepcionista

Responsable de las tareas administrativas relacionadas con el ingreso de información al sistema.

Puede:

- Gestionar clientes.
- Gestionar vehículos.
- Gestionar aseguradoras.
- Registrar siniestros.
- Consultar siniestros.
- Consultar presupuestos.
- Modificar manualmente el estado de un presupuesto ENVIADO a APROBADO o RECHAZADO cuando falle el procesamiento automático de la respuesta de la aseguradora.

No puede:

- Crear presupuestos.
- Generar Órdenes de Trabajo.
- Gestionar usuarios y permisos.



## 3.2. Encargado del Taller

Representa al responsable general del taller.

Debido a la estructura reducida del taller, puede realizar tanto tareas administrativas como operativas.

Puede:

- Realizar todas las acciones disponibles para la Recepcionista.
- Registrar presupuestos.
- Editar presupuestos en estado `BORRADOR`.
- Confirmar y enviar presupuestos.
- Generar Órdenes de Trabajo.
- Editar Órdenes de Trabajo en estado `BORRADOR`.
- Finalizar la generación de una Orden de Trabajo.
- Gestionar usuarios y permisos.



## 3.3. Mecánico

En el alcance actual únicamente utiliza las Órdenes de Trabajo como fuente de consulta.

Puede:

- Consultar Órdenes de Trabajo finalizadas.

No puede:

- Crear ni modificar Órdenes de Trabajo.
- Registrar siniestros.
- Registrar presupuestos.

La ejecución y seguimiento de las tareas dentro del taller quedan fuera del alcance del MVP.



## 3.4. Administrador

Responsable del módulo de seguridad.

Puede:

- Crear usuarios.
- Modificar usuarios.
- Dar de baja usuarios.
- Asignar roles y permisos.
- Reactivar usuarios.



# 4. Entidades conceptuales

Las principales entidades del dominio son:

- Usuario
- Cliente
- Vehículo
- Aseguradora
- Siniestro
- DocumentoSiniestro
- Presupuesto
- DetalleReparacion
- DetalleRepuesto
- Reparacion
- Repuesto
- OrdenDeTrabajo
- Sector
- OrdenTrabajoSector

También existen catálogos y valores predefinidos asociados al dominio.

Todas las entidades del sistema utilizarán UUID como identificador técnico.

## 4.1. Catálogos precargados

Los siguientes datos estarán inicialmente precargados mediante datos de inicialización del sistema:

- Marca
- Modelo
- TipoVehiculo
- Provincia
- Localidad
- Reparacion
- Repuesto
- Sector

Cada Modelo pertenece a una única Marca. Una Marca puede tener múltiples Modelos.

Cada Localidad pertenece a una única Provincia. Una Provincia puede tener múltiples Localidades.

No se requiere implementar interfaces de administración para estos catálogos dentro del alcance actual.



# 5. Gestión de Clientes

El sistema debe permitir realizar CRUD de clientes.

Datos mínimos:

- ID
- Nombre
- Apellido
- DNI
- Teléfono
- Email
- Dirección
- Localidad
- Provincia
- Estado activo/inactivo

El DNI de cada cliente debe ser único.

La relación entre un Cliente y un Vehículo se establece al registrar un Siniestro. Un cliente puede estar asociado a distintos vehículos en diferentes siniestros.

## 5.1. Baja de Cliente

La eliminación de un cliente será lógica.

Un cliente dado de baja:

- permanece almacenado;
- continúa apareciendo en registros históricos;
- no puede utilizarse para nuevas operaciones.



# 6. Gestión de Vehículos

El sistema debe permitir realizar CRUD de vehículos.

Datos mínimos:

- ID
- Patente
- Marca
- Modelo
- Tipo de vehículo
- Estado activo/inactivo

La patente de cada vehículo debe ser única.

La relación entre un Cliente y un Vehículo se establece al registrar un Siniestro. Un vehículo puede estar asociado a distintos clientes en diferentes siniestros.


## 6.1. Baja de Vehículo

La eliminación será lógica.

Un vehículo inactivo:

- permanece almacenado;
- conserva sus relaciones históricas;
- no puede seleccionarse para registrar nuevos siniestros.



# 7. Gestión de Aseguradoras

El sistema debe permitir realizar CRUD de aseguradoras.

Datos:

- ID
- Nombre
- CUIT
- Teléfono
- Email
- Dirección
- Estado activo/inactivo

El CUIT de cada aseguradora debe ser único.

## 7.1. Baja de Aseguradora

La eliminación será lógica.

Una aseguradora inactiva:

- permanece almacenada;
- continúa apareciendo en siniestros y presupuestos históricos;
- no puede seleccionarse para nuevas operaciones.



# 8. Iteración 1 — Registrar Siniestro

## 8.1. Actor

- Recepcionista.
- Encargado del Taller.

## 8.2. Objetivo

Registrar un nuevo siniestro asociado a un cliente, vehículo y aseguradora existentes.

## 8.3. Precondiciones

- El usuario debe estar autenticado.
- El usuario debe tener permisos para registrar siniestros.
- El cliente debe existir y encontrarse activo.
- El vehículo debe existir y encontrarse activo.
- La aseguradora debe existir y encontrarse activa.

## 8.4. Datos del siniestro

El sistema debe permitir registrar:

- Número de siniestro.
- Fecha del siniestro.
- Grado del daño.
- Número de póliza.
- Cliente.
- Vehículo.
- Aseguradora.

### Grado del daño

Los valores posibles son:

- `LEVE`
- `MODERADO`
- `GRAVE`

El grado del daño es únicamente informativo y no modifica otras reglas de negocio.

## 8.5. Documentación

Para registrar el siniestro deberán adjuntarse:

- Foto de la denuncia.
- Foto lateral derecha.
- Foto lateral izquierda.
- Foto frontal.
- Foto trasera.
- Foto del certificado de cobertura.

También podrán adjuntarse fotografías adicionales opcionales.

Los archivos se almacenarán utilizando un servicio externo de almacenamiento.

## 8.6. Extracción automática de información

El sistema podrá utilizar un servicio externo de IA para analizar la imagen de la denuncia y extraer:

- Número de siniestro.
- Número de póliza.

Los valores obtenidos serán utilizados para autocompletar los campos correspondientes.

La información obtenida mediante IA deberá poder ser verificada y corregida antes de confirmar el registro.

La IA constituye una dependencia accesoria.

Si el servicio no responde, supera el tiempo máximo de espera o no puede interpretar correctamente el documento:

- el sistema no debe fallar;
- el usuario podrá ingresar los valores manualmente;
- deberá registrarse el fallo técnico correspondiente.

## 8.7. Validaciones

- El número de siniestro es obligatorio.
- El número de siniestro debe ser único.
- La fecha del siniestro es obligatoria.
- La fecha del siniestro no puede ser posterior a la fecha de registro.
- Debe existir un cliente activo.
- Debe existir un vehículo activo.
- Debe existir una aseguradora activa.
- Debe indicarse el número de póliza.
- Toda la documentación obligatoria debe encontrarse cargada.


## 8.8. Confirmar registro

Si todas las validaciones son correctas:

- se registra el siniestro;
- el siniestro queda en estado `REGISTRADO`.

Los siniestros no se almacenan como borradores.

## 8.9. Cancelar

La operación se cancela sin registrar el siniestro.



# 9. Estados del Siniestro

Los estados incluidos en el MVP son:

- `REGISTRADO`
- `PRESUPUESTADO`
- `PENDIENTE_DE_FACTURACION`

## 9.1. Transiciones

`REGISTRADO → PRESUPUESTADO`

Ocurre cuando se registra el primer presupuesto asociado al siniestro.

`PRESUPUESTADO → PENDIENTE_DE_FACTURACION`

Ocurre cuando se finaliza la generación de la Orden de Trabajo correspondiente al trabajo que continuará en el taller.

`PENDIENTE_DE_FACTURACION` representa el final del flujo implementado en este MVP.

La facturación, los pagos y el cierre administrativo posterior quedan fuera del alcance.



# 10. Iteración 2 — Registrar Presupuesto

## 10.1. Actor

Encargado del Taller.

## 10.2. Objetivo

Registrar un presupuesto asociado a un siniestro, especificando las reparaciones y repuestos necesarios.

## 10.3. Precondiciones

- El usuario debe estar autenticado.
- Debe tener permisos para gestionar presupuestos.
- Debe existir un siniestro registrado.

## 10.4. Selección del siniestro

El Encargado seleccionará un siniestro.

El sistema recuperará:

- Cliente.
- Vehículo.
- Patente.
- Marca.
- Modelo.
- Aseguradora.

Un siniestro puede tener múltiples presupuestos.



# 11. Reparaciones del Presupuesto

Las reparaciones se seleccionan desde un catálogo predefinido.

Cada reparación incorporada al presupuesto deberá registrar:

- Reparación.
- Costo.

Una misma reparación del catálogo puede utilizarse en diferentes presupuestos.

Dentro de un mismo Presupuesto, una Reparación del catálogo no puede incorporarse más de una vez.

El costo corresponde específicamente al presupuesto en el que se incorpora.



# 12. Repuestos del Presupuesto

Los repuestos se seleccionan desde un catálogo predefinido.

Cada repuesto incorporado debe registrar:

- Repuesto.
- Cantidad.

Dentro de un mismo Presupuesto, un Repuesto del catálogo no puede incorporarse más de una vez. La cantidad requerida se registra en el campo Cantidad del detalle correspondiente.

El sistema no administra el precio de los repuestos.

Los valores correspondientes a repuestos son determinados por la aseguradora y quedan fuera del cálculo realizado por LuqGarage.

La incorporación de repuestos al presupuesto es opcional. Un presupuesto puede no contener repuestos.

# 13. Total del Presupuesto

El total del presupuesto se calcula como la suma de los costos de todas las reparaciones incluidas.

Conceptualmente:

`TOTAL = Σ costo de reparaciones`

El total no incluye el valor de los repuestos.



# 14. Estados del Presupuesto

Los estados son:

- `BORRADOR`
- `ENVIADO`
- `APROBADO`
- `RECHAZADO`

## 14.1. Flujo

`BORRADOR → ENVIADO → APROBADO`

o:

`BORRADOR → ENVIADO → RECHAZADO`

## 14.2. Borrador

Mientras el presupuesto esté en estado `BORRADOR`:

- puede modificarse;
- pueden agregarse o quitarse reparaciones;
- pueden agregarse o quitarse repuestos;
- puede guardarse y continuarse posteriormente.

## 14.3. Presupuesto enviado

Al confirmar el presupuesto, LuqGarage lo envia por email a la aseguradora.

El servicio de email constituye una dependencia esencial para esta operación.

El presupuesto solamente pasa a `ENVIADO` cuando el servicio externo confirma correctamente el envío.

Si el envío falla:

- el presupuesto permanece en `BORRADOR`;
- la operación debe informar el error;
- la falla debe registrarse;
- debe ser posible reintentar posteriormente.

Una vez `ENVIADO`, el presupuesto no puede modificarse.

## 14.4. Presupuesto aprobado

Un presupuesto pasa de `ENVIADO` a `APROBADO` cuando el sistema procesa una respuesta válida de aprobación recibida por email.

## 14.5. Presupuesto rechazado

Un presupuesto pasa de `ENVIADO` a `RECHAZADO` cuando el sistema procesa una respuesta válida de rechazo recibida por email.

Un presupuesto rechazado:

- no puede modificarse;
- no puede utilizarse para generar una Orden de Trabajo.

Si se necesita realizar una nueva propuesta, deberá generarse un nuevo presupuesto asociado al mismo siniestro.

El nuevo presupuesto podrá tomar como referencia el presupuesto rechazado, pero tendrá identidad y número propios.



# 15. Comunicación con la Aseguradora

En el MVP, la comunicación por email con la aseguradora será simulada mediante Mailtrap Email Sandbox.

## 15.1. Envío

Cuando el Encargado confirma un presupuesto:

1. El sistema valida el presupuesto.
2. Intenta enviarlo mediante el servicio externo.
3. Si el envío resulta exitoso, cambia su estado a `ENVIADO`.
4. Si falla, permanece en `BORRADOR`.

## 15.2. Recepción

La aseguradora simulada responderá mediante email indicando si el presupuesto fue:

- `APROBADO`
- `RECHAZADO`

LuqGarage deberá recuperar y procesar la respuesta recibida.

La respuesta deberá permitir identificar claramente el presupuesto al cual corresponde.

## 15.3. Procesamiento

Si la respuesta puede interpretarse claramente:

- aprobación → `APROBADO`;
- rechazo → `RECHAZADO`.

Si la respuesta no puede interpretarse:

- el presupuesto permanece en `ENVIADO`;
- no se realiza una transición automática;
- el problema debe quedar registrado.

El sistema no debe interpretar una respuesta ambigua como una aprobación.



# 16. Iteración 3 — Generar Orden de Trabajo

## 16.1. Actor

Encargado del Taller.

## 16.2. Objetivo

Generar una Orden de Trabajo utilizando uno o varios presupuestos aprobados pertenecientes al mismo siniestro.

## 16.3. Precondiciones

- El usuario debe estar autenticado.
- Debe tener permisos para gestionar Órdenes de Trabajo.
- Debe existir el siniestro.
- Debe existir al menos un presupuesto `APROBADO`.
- Los presupuestos seleccionados deben pertenecer al mismo siniestro.
- Los presupuestos seleccionados no deben estar asociados previamente a otra Orden de Trabajo.



# 17. Selección de Presupuestos para la Orden de Trabajo

El Encargado seleccionará un siniestro.

El sistema recuperará los presupuestos aprobados asociados al siniestro que todavía no pertenezcan a una Orden de Trabajo.

El Encargado podrá seleccionar:

- un presupuesto aprobado; o
- varios presupuestos aprobados.

Todos deberán pertenecer al mismo siniestro.

Una Orden de Trabajo puede contener múltiples presupuestos.

Un presupuesto puede pertenecer como máximo a una Orden de Trabajo.

Una vez asociado a una Orden de Trabajo, no podrá reutilizarse para generar otra.



# 18. Tareas de la Orden de Trabajo

Las tareas de la Orden de Trabajo provienen de las reparaciones existentes en los presupuestos seleccionados.

Cada reparación del presupuesto equivale a una tarea de la Orden de Trabajo.

No pueden agregarse tareas nuevas directamente desde la Orden de Trabajo.



# 19. Sectores

Los sectores disponibles son:

- Desarme.
- Reparación.
- Preparación.
- Pintura.
- Armado.
- Terminado.

Cada reparación del catálogo está asociada a un único sector.

Un sector puede contener múltiples reparaciones.

Al generar la Orden de Trabajo, las reparaciones provenientes de los presupuestos deberán organizarse de acuerdo con su sector.



# 20. Observaciones por Sector

Cada sector incluido en una Orden de Trabajo podrá tener una observación opcional.

La observación:

- puede ser creada por el Encargado;
- puede modificarse mientras la Orden de Trabajo permanezca en `BORRADOR`.



# 21. Estados de la Orden de Trabajo

Los estados incluidos en el MVP son:

- `BORRADOR`
- `FINALIZADA`

No se incluye un estado `EN_PROCESO`, debido a que la ejecución de las reparaciones dentro del taller queda fuera del alcance actual.

## 21.1. Borrador

La Orden de Trabajo puede guardarse en `BORRADOR` y continuar editándose posteriormente.

## 21.2. Finalización

Una Orden de Trabajo puede pasar a `FINALIZADA` cuando:

- tiene al menos un presupuesto aprobado asociado;
- todas las reparaciones provenientes de los presupuestos están asociadas a un sector.

La finalización representa que **la creación de la Orden de Trabajo ha concluido**, no que el vehículo haya sido reparado.

Las fechas reales de inicio y finalización de la reparación del vehículo no forman parte de este MVP.


# 22. Reglas de negocio

### RN01 — Número de siniestro único

No pueden existir dos siniestros con el mismo número.

### RN02 — Fecha del siniestro

La fecha del siniestro no puede ser posterior a la fecha de registro.

### RN03 — Cliente requerido

Todo siniestro debe estar asociado a un cliente activo.

### RN04 — Vehículo requerido

Todo siniestro debe estar asociado a un vehículo activo.

### RN05 — Aseguradora requerida

Todo siniestro debe estar asociado a una aseguradora activa.

### RN06 — Documentación obligatoria

Un siniestro solo puede confirmarse cuando se haya cargado toda la documentación obligatoria.

### RN07 — Presupuesto asociado

Todo presupuesto debe pertenecer a un siniestro existente.

### RN08 — Múltiples presupuestos

Un siniestro puede tener múltiples presupuestos.

### RN09 — Edición del presupuesto

Solo los presupuestos en estado `BORRADOR` pueden modificarse.

### RN10 — Envío del presupuesto

Un presupuesto solo pasa a `ENVIADO` cuando el servicio de email confirma correctamente su envío.

### RN11 — Respuesta de aseguradora

Un presupuesto `ENVIADO` puede pasar a `APROBADO` o `RECHAZADO` como resultado del procesamiento automático de una respuesta válida de la aseguradora o, ante una falla del procesamiento automático, mediante el registro manual de dicha respuesta por un usuario autorizado.

### RN12 — Respuesta ambigua

Una respuesta que no pueda interpretarse inequívocamente no modifica el estado del presupuesto.

### RN13 — Presupuesto rechazado

Un presupuesto `RECHAZADO` no puede modificarse ni utilizarse en una Orden de Trabajo.

### RN14 — Nuevo presupuesto

Si después de un rechazo se necesita presentar otra propuesta, debe crearse un nuevo presupuesto.

### RN15 — Generación de Orden de Trabajo

Solo pueden incorporarse a una Orden de Trabajo presupuestos en estado `APROBADO`.

### RN16 — Mismo siniestro

Todos los presupuestos de una Orden de Trabajo deben pertenecer al mismo siniestro.

### RN17 — Uso único de presupuesto

Un presupuesto puede pertenecer como máximo a una Orden de Trabajo.

### RN18 — Tareas de la Orden de Trabajo

Las tareas provienen exclusivamente de las reparaciones incluidas en los presupuestos asociados.

No pueden agregarse nuevas tareas desde la Orden de Trabajo.

### RN19 — Sector de reparación

Cada reparación pertenece a un único sector.

Un sector puede contener múltiples reparaciones.

### RN20 — Finalización de la Orden de Trabajo

La creación de la Orden de Trabajo solo puede finalizar cuando todas las reparaciones se encuentren correctamente sectorizadas.

### RN21 — Estado del siniestro

Cuando se registra el primer presupuesto, el siniestro pasa a `PRESUPUESTADO`.

Cuando se finaliza la Orden de Trabajo correspondiente, el siniestro pasa a `PENDIENTE_DE_FACTURACION`.

### RN22 — Baja lógica

Clientes, Vehículos y Aseguradoras se eliminan mediante baja lógica.

Los registros inactivos permanecen disponibles para consultas históricas, pero no pueden utilizarse en operaciones nuevas.

### RN23 — Historial

Siniestros, Presupuestos y Órdenes de Trabajo no pueden eliminarse.

### RN24 — Actualización manual del estado

Si el sistema no puede procesar automáticamente la respuesta de la aseguradora, la Recepcionista o el Encargado podrán registrar manualmente el resultado, cambiando un presupuesto ENVIADO a APROBADO o RECHAZADO.


# 23. Integraciones externas

## 23.1. Supabase Storage

Se utilizará almacenamiento externo para guardar las fotografías y documentación asociadas a los siniestros.

La base de datos almacenará únicamente la información necesaria para relacionar cada archivo con su siniestro.

Las credenciales del servicio deberán utilizarse exclusivamente del lado servidor.

## 23.2. Servicio de IA

Se utilizará un servicio externo de IA para extraer de la denuncia:

- número de siniestro;
- número de póliza.

Esta integración es accesoria.

Una falla del servicio no debe impedir registrar el siniestro, siempre que los datos requeridos sean ingresados manualmente.

## 23.3. Mailtrap

Mailtrap Email Sandbox se utilizará en el MVP para simular la comunicación por email con las aseguradoras.

El sistema deberá:

- enviar presupuestos;
- recuperar respuestas;
- identificar el presupuesto correspondiente;
- determinar si fue aprobado o rechazado;
- actualizar su estado cuando la respuesta sea válida.

El uso de Mailtrap representa una simulación del proceso de comunicación y no una integración real con los sistemas internos de una aseguradora.


# 24. Manejo de fallas de servicios externos

Toda integración externa debe contemplar:

- timeout;
- manejo explícito de errores;
- registro de fallas;
- protección de credenciales;
- mantenimiento de la consistencia de los datos.

Las credenciales nunca deberán exponerse al cliente.

## 24.1. Falla de IA

Si falla:

- se permite continuar manualmente;
- no se pierde la información cargada;
- se registra el error.

## 24.2. Falla de envío de email

Si falla el envío:

- el presupuesto no pasa a `ENVIADO`;
- permanece en `BORRADOR`;
- se informa el error;
- puede reintentarse.

## 24.3. Falla al consultar respuestas

Si la respuesta de la aseguradora fue recibida por un medio verificable pero el sistema no pudo procesarla automáticamente, un usuario autorizado podrá registrar manualmente el resultado.


## 24.4. Respuesta inválida

Si se recibe un email cuyo contenido no permite determinar aprobación o rechazo:

- no se modifica el presupuesto;
- permanece `ENVIADO`;
- se registra el incidente.


# 25. Persistencia de borradores

Presupuestos y Órdenes de Trabajo podrán guardarse explícitamente en estado `BORRADOR`, permitiendo continuar su edición posteriormente.

La recuperación automática de información que todavía no haya sido enviada al servidor ante una pérdida de conexión queda fuera del alcance del MVP.

Los siniestros no disponen de estado borrador.


# 26. Autenticación y autorización

El sistema deberá requerir autenticación mediante usuario y contraseña.

Las operaciones protegidas deberán verificar:

1. que exista una sesión válida;
2. que el usuario posea el rol o permiso requerido;

Las validaciones de autorización deben realizarse del lado servidor.


# 27. Manejo de errores

La API utilizará códigos HTTP coherentes con el resultado de la operación.

Como criterio general:

- `400 Bad Request`: datos inválidos.
- `401 Unauthorized`: usuario no autenticado.
- `403 Forbidden`: usuario sin permisos.
- `404 Not Found`: recurso inexistente.
- `409 Conflict`: operación incompatible con el estado o las reglas de negocio.
- `500 Internal Server Error`: error inesperado.

Los errores de servicios externos deberán manejarse evitando dejar datos en estados inconsistentes.


# 28. Requisitos no funcionales

## RNF01 — Autenticación y autorización

Solo usuarios autenticados y autorizados pueden ejecutar operaciones protegidas.

## RNF02 — Validación del servidor

Toda información recibida debe validarse del lado servidor.

## RNF03 — Persistencia

La información confirmada debe persistirse en la base de datos.

## RNF04 — Borradores

Presupuestos y Órdenes de Trabajo pueden persistirse como borradores.

## RNF05 — Integraciones externas

Las integraciones externas deben contemplar timeout, errores y registro de fallas.

## RNF06 — Seguridad de credenciales

Tokens, API keys, secretos y credenciales solo pueden utilizarse del lado servidor y mediante variables de entorno.

## RNF07 — Consistencia

Una falla de un servicio externo no debe dejar información en un estado incorrecto.

## RNF08 — Trazabilidad

Las operaciones relevantes y fallas de integraciones externas deberán poder registrarse para facilitar diagnóstico y seguimiento.


# 29. Fuera de alcance

Quedan fuera del alcance del MVP:

- Módulo para clientes particulares.
- Validación de licencia de conducir.
- Validación de vigencia del seguro.
- Gestión de stock.
- Gestión de inventario.
- Costos de repuestos.
- Facturación.
- Registro de pagos.
- Generación de recibos.
- Seguimiento de avance de reparaciones.
- Asignación de mecánicos a tareas.
- Registro de inicio real de una reparación.
- Registro de finalización real de una reparación.
- Reportes.
- Estadísticas.
- Integración real con sistemas internos de aseguradoras.


# 30. Flujo general del MVP

RECEPCIONISTA / ENCARGADO
           │
           ▼
   Registrar Siniestro
           │
           ├── Documentación → Storage externo
           │
           └── Denuncia → IA (opcional)
           │
           ▼
     SINIESTRO: REGISTRADO
           │
           ▼
   ENCARGADO DEL TALLER
           │
           ▼
     Crear Presupuesto
           │
           ▼
      BORRADOR
           │
           │ confirmar
           ▼
    Enviar por email
           │
      ┌────┴─────┐
      │          │
    falla        OK
      │          │
      ▼          ▼
  BORRADOR     ENVIADO
                  │
                  ▼
          Respuesta aseguradora
                  │
            ┌─────┴─────┐
            ▼           ▼
        APROBADO     RECHAZADO
            │
            │
            │ uno o varios presupuestos
            │ aprobados del mismo siniestro
            ▼
       Crear Orden de Trabajo
                  │
                  ▼
              BORRADOR
                  │
                  ▼
      Organizar reparaciones
           por sectores
                  │
                  ▼
              FINALIZADA
                  │
                  ▼
              SINIESTRO:
      PENDIENTE_DE_FACTURACION
                  │
                  ▼
          FIN DEL MVP


# 31. Criterio de finalización del MVP

El MVP se considera funcional cuando el flujo completo puede ejecutarse desde un cliente HTTP sin depender de una interfaz gráfica:

1. Autenticar un usuario.
2. Registrar/consultar Cliente.
3. Registrar/consultar Vehículo.
4. Registrar/consultar Aseguradora.
5. Registrar un Siniestro con su documentación.
6. Crear un Presupuesto.
7. Incorporar reparaciones y, opcionalmente, repuestos.
8. Guardarlo como `BORRADOR`.
9. Confirmarlo y enviarlo.
10. Procesar una respuesta simulada de aseguradora.
11. Obtener un presupuesto `APROBADO`.
12. Seleccionar uno o varios presupuestos aprobados del mismo siniestro.
13. Generar una Orden de Trabajo.
14. Organizar sus reparaciones por sectores.
15. Finalizar la Orden de Trabajo.
16. Obtener el Siniestro en estado `PENDIENTE_DE_FACTURACION`.

Todo el flujo deberá respetar las reglas de negocio, autenticación, autorización, validaciones y manejo de fallas definidos en este documento.
