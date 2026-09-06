---
title: "10 preguntas ‘premium’ para entrevistar a un Senior .NET* (*y detectar respuestas de brochure)"
description: "Cómo responder diez preguntas clásicas sobre arquitectura, async, rendimiento, resiliencia, EF Core, seguridad y multi-tenancy sin recitar buzzwords como si fueran experiencia."
publishedAt: 2026-09-06T12:00:00-03:00
tags:
  - dotnet
  - csharp
  - arquitectura
  - entrevistas
  - rendimiento
  - seguridad
draft: false
---

Cada tanto aparece una lista de “preguntas premium para entrevistar a un Senior .NET”. Son diez preguntas inocentes, hasta que uno descubre que cada una podría ocupar una tarde, una arquitectura completa o un incidente de producción con gente importante mirando un dashboard.

La lista que encontré menciona Clean Architecture, `async/await`, microservicios, Entity Framework Core, OAuth, inyección de dependencias, procesamiento en background y multi-tenancy. Es decir: prácticamente toda la plataforma, más sistemas distribuidos, más seguridad, antes del café.

No está mal. El problema aparece si esperamos una contraseña exacta para cada pregunta. Una respuesta senior no es la que contiene más nombres de patrones. Es la que empieza haciendo preguntas, explicita restricciones, reconoce trade-offs y sabe qué medir antes de cambiar cosas.

Una aclaración temporal: la lista original habla de .NET 8. Sigue siendo una versión LTS soportada, pero [su soporte termina en noviembre de 2026](https://learn.microsoft.com/en-us/dotnet/core/releases-and-support). Los principios de este artículo aplican a .NET moderno en general; una decisión nueva también debería considerar .NET 10 LTS.

Con eso dicho, pongamos las diez preguntas sobre la mesa. Prometo no responder “depende” sin explicar inmediatamente **de qué depende**.

## 1. ¿Cómo arquitecturarías una aplicación .NET altamente escalable?

Primero preguntaría qué significa “altamente escalable”. ¿Diez mil requests por segundo? ¿Un equipo que pasará de cuatro a cuarenta personas? ¿Millones de registros? ¿Picos impredecibles? ¿Escalar lecturas, escrituras o la cantidad de cambios que hacemos sin romper todo?

Sin esa información, mi punto de partida suele ser un **monolito modular**. No porque los microservicios sean malos, sino porque distribuir un sistema antes de entender sus límites de negocio transforma dudas de diseño en latencia, consistencia eventual y reuniones.

Dividiría el sistema por capacidades del negocio —ventas, facturación, identidad, catálogo— y no por carpetas técnicas globales. Dentro de cada módulo, Vertical Slice Architecture suele funcionar muy bien: cada caso de uso contiene su endpoint, validación, modelo de entrada, lógica y persistencia necesaria.

```text
src/
  Modules/
    Orders/
      CreateOrder/
        Endpoint.cs
        Command.cs
        Handler.cs
        Validator.cs
      GetOrder/
        Endpoint.cs
        Query.cs
        Handler.cs
      Domain/
        Order.cs
        OrderLine.cs
```

Clean Architecture aporta valor donde existen límites reales: el dominio no debería depender de EF Core, de una cola o de un proveedor de pagos. Pero eso no obliga a crear `IOrderRepository`, `OrderRepository`, `OrderService`, `OrderManager` y `OrderCoordinator` para actualizar una columna.

Aplicaría inversión de dependencias en los bordes que cambian o tienen efectos externos: reloj, almacenamiento, pagos, correo, identidad. No fabricaría interfaces por reflejo. Una interfaz con una sola implementación y ninguna razón de negocio puede ser abstracción; también puede ser una ceremonia con buen marketing.

Los límites del dominio deberían proteger invariantes. Si una orden no puede confirmarse sin líneas, esa regla vive junto a la orden. Si dos módulos necesitan compartir cada entidad y cada tabla, todavía no encontramos los módulos: dibujamos rectángulos.

**Lo que delata seniority:** no elegir entre Clean y Vertical Slice como si fueran clubes de fútbol. Se pueden combinar. La arquitectura debe reducir el costo del cambio, no maximizar la cantidad de proyectos en la solución.

## 2. Explicá `async/await` en profundidad

`async` no crea un thread y `Task` no es un thread con ropa formal. Un `Task` representa una operación que eventualmente terminará.

El compilador transforma un método `async` en una máquina de estados. Cuando encuentra un `await` sobre una operación incompleta, conserva el estado necesario, devuelve el control al llamador y registra una continuación. Cuando la operación termina, esa continuación reanuda el método.

En I/O asíncrono —una consulta SQL, un socket, un archivo— no hace falta dejar un thread sentado esperando. El sistema operativo avisa que hay datos y entonces el runtime agenda la continuación. Para trabajo de CPU, en cambio, alguien debe ejecutar las instrucciones: normalmente un thread del `ThreadPool`. Poner `Task.Run` alrededor de una consulta HTTP no la vuelve más asíncrona; sólo agrega un paseo.

En ASP.NET Core no existe por defecto un `SynchronizationContext` que obligue a volver al thread original. Por eso el deadlock clásico de aplicaciones de escritorio es menos frecuente dentro de una request. Menos frecuente no significa que bloquear sea gratis:

```csharp
// Bloquea un thread mientras espera. Bajo carga puede agotar el ThreadPool.
Order order = service.GetOrderAsync(id).Result;

// Libera el thread mientras la operación de I/O está pendiente.
Order order = await service.GetOrderAsync(id, cancellationToken);
```

El famoso “async all the way” no es un credo religioso. Evita mezclar esperas bloqueantes (`.Result`, `.Wait()`, `GetAwaiter().GetResult()`) con un modelo basado en continuaciones.

`ConfigureAwait(false)` sigue siendo relevante para bibliotecas que no deberían depender del contexto del consumidor. En código ASP.NET Core ordinario suele ser redundante porque no hay un contexto de sincronización que capturar. Agregarlo mecánicamente a cada línea produce más puntuación que rendimiento.

Para diagnosticar starvation miraría primero síntomas: latencia creciente, CPU lejos del 100 %, cola del `ThreadPool` aumentando y creación sostenida de threads. [`dotnet-counters`, `dotnet-stack` y `dotnet-trace`](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-threadpool-starvation) permiten observar contadores, stacks y trazas. Después buscaría bloqueo sincrónico, locks largos, llamadas de red sin timeout y trabajo de CPU compitiendo dentro del proceso web.

**Lo que delata seniority:** distinguir I/O de CPU, deadlock de starvation y concurrencia de paralelismo. Decir “usaría `ConfigureAwait(false)`” no sustituye ninguna de esas distinciones.

## 3. Una API pasó de 200 ms a 3 segundos en producción. ¿Qué hacés?

No empezaría “optimizando el código”. Empezaría preservando evidencia.

Primero definiría el alcance:

- ¿subieron p50, p95 o p99?
- ¿afecta todos los endpoints, una operación, un tenant o una región?
- ¿empezó con un deploy, con mayor tráfico o sin un evento visible?
- ¿los tres segundos ocurren dentro de nuestra aplicación o antes de llegar a ella?

Después tomaría una request lenta y seguiría su traza de punta a punta. En .NET, [`System.Diagnostics.Activity`](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing) representa spans que pueden cruzar procesos. Una buena traza permite separar tiempo de aplicación, base de datos, caché, DNS, conexión, dependencia HTTP y cola.

El orden práctico sería:

1. Confirmar el síntoma con métricas y comparar con el período sano.
2. Correlacionar el inicio con despliegues, configuración, volumen y estado de dependencias.
3. Localizar el span lento mediante tracing distribuido.
4. Revisar SQL real, planes de ejecución, bloqueos, índices, volumen devuelto y pool de conexiones.
5. Examinar dependencias externas: latencia, errores, retries acumulados, DNS y timeouts.
6. Observar CPU, memoria, pausas de GC, excepciones, `ThreadPool`, sockets y límites del contenedor.
7. Reproducir con una carga representativa y un perfil, no con una request feliz desde localhost.

Un retry mal configurado puede convertir una dependencia que tarda un segundo en una API que tarda tres. Una consulta sin índice puede funcionar durante años hasta que la tabla cruza cierto tamaño. Una pausa de GC puede ser causa, pero también consecuencia de materializar 400 MB por request.

Si el impacto es serio y coincide con el último release, revertir o apagar una feature es una medida de recuperación, no una admisión de derrota. Primero dejamos de lastimar usuarios; luego alimentamos nuestra curiosidad científica.

**Lo que delata seniority:** formular hipótesis que puedan refutarse. “Agregaría más logs” no es un plan si no sabemos qué pregunta debe responder cada log.

## 4. ¿Cómo diseñarías microservicios resilientes?

Mi primera medida de resiliencia sería confirmar que necesitamos microservicios. Un monolito modular puede fallar; un sistema distribuido puede fallar en más lugares, parcialmente y con mensajes fuera de orden. Es una diferencia bastante creativa.

Cuando la separación sí está justificada —equipos autónomos, escalado independiente, límites de negocio maduros— cada servicio debe ser dueño de sus datos y publicar contratos explícitos. Evitaría compartir tablas y modelos internos, porque eso produce el costo operacional de los microservicios con el acoplamiento de un monolito.

Usaría HTTP o gRPC para una respuesta inmediata que realmente necesita el llamador, y mensajería asíncrona cuando el proceso tolera consistencia eventual. Toda llamada remota tendría un timeout menor que el presupuesto total de la request.

Los retries sirven para fallas transitorias, con backoff y jitter. No deben repetirse en cada capa ni aplicarse ciegamente sobre operaciones con efectos. La documentación moderna de .NET recomienda [`Microsoft.Extensions.Http.Resilience`](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience) para componer timeouts, retry y circuit breaker; también advierte que reintentar `POST`, `PUT`, `PATCH` o `DELETE` puede duplicar efectos.

Ahí entra la idempotencia:

```http
POST /payments
Idempotency-Key: order-8472-payment-1
```

El receptor persiste la clave junto al resultado. Si llega el mismo pedido, devuelve el resultado anterior y no cobra dos veces. El optimismo es una virtud humana; no es un mecanismo de consistencia.

Un circuit breaker evita seguir golpeando una dependencia enferma. Un bulkhead limita cuánto daño puede propagar. El patrón outbox guarda el cambio de negocio y el evento en la misma transacción local; un publicador envía luego el evento. Del otro lado, inbox/deduplicación permite procesar al menos una vez sin aplicar el efecto más de una vez.

No intentaría simular una transacción ACID entre servicios. Modelaría estados intermedios, compensaciones y observabilidad: una orden puede estar `PendingPayment`, `Confirmed` o `CompensationRequired`. Lo eventual debe ser visible, no una sorpresa escondida detrás de un spinner.

**Lo que delata seniority:** saber que retry, circuit breaker e idempotencia resuelven problemas diferentes. Nombrar los tres juntos no crea resiliencia por ósmosis.

## 5. EF Core consume demasiada memoria y las consultas son lentas

Primero capturaría el SQL generado y el plan de ejecución. [La guía de rendimiento de EF Core](https://learn.microsoft.com/en-us/ef/core/performance/) insiste en separar costos de base, red, driver y ORM. Culpar al ORM antes de mirar la consulta es como cambiar el volante porque el auto no tiene combustible.

Para endpoints de lectura usaría proyecciones y `AsNoTracking()`:

```csharp
OrderSummary? order = await db.Orders
    .AsNoTracking()
    .Where(x => x.Id == id)
    .Select(x => new OrderSummary(
        x.Id,
        x.Number,
        x.Customer.Name,
        x.Total,
        x.Lines.Count))
    .SingleOrDefaultAsync(cancellationToken);
```

Esto evita materializar columnas y grafos que nadie pidió, y elimina el costo del change tracker cuando no habrá actualización. No convertiría `AsNoTracking()` en configuración universal: para modificar una entidad, tracking puede ser exactamente lo correcto.

Buscaría además:

- N+1 provocado por lazy loading o consultas dentro de un loop;
- `Include` enormes que multiplican filas por productos cartesianos;
- falta de paginación o límites;
- filtros y ordenamientos sin índices adecuados;
- llamadas múltiples que podrían proyectarse en una sola consulta;
- consultas que cargan datos y luego filtran en memoria.

`AsSplitQuery()` puede evitar la explosión cartesiana al cargar varias colecciones, a cambio de más viajes a la base y posibles consideraciones de consistencia. No es un botón de “hacer rápido”.

Las compiled queries ayudan en rutas extremadamente calientes y estables, cuando el costo de compilar la expresión es significativo respecto del resto. Si SQL tarda 2,8 segundos, ahorrar microsegundos en EF merece una medalla por entusiasmo, no por impacto.

Mantendría `DbContext` corto y scoped. Puede usarse pooling del contexto luego de medir, con especial cuidado si contiene estado variable como el tenant actual. El pool de conexiones normalmente pertenece al proveedor; abrir tarde y cerrar pronto permite reutilizar conexiones. Guardar un contexto en un singleton no es pooling: es una forma elaborada de coleccionar problemas de concurrencia.

**Lo que delata seniority:** optimizar el volumen de datos y los viajes a la base antes de buscar una opción esotérica del ORM.

## 6. Autenticación y autorización en una aplicación enterprise

No construiría un Identity Provider propio. Usaría uno consolidado —Entra ID, Keycloak, Auth0 u otro compatible— y protocolos estándar.

OAuth 2.0 trata autorización delegada; OpenID Connect agrega identidad. Para aplicaciones web interactivas usaría Authorization Code Flow con PKCE. Para procesos sin usuario, Client Credentials. Una API que recibe un access token debe validar firma, issuer, audience y expiración; no alcanza con decodificar el JWT y admirar su contenido. La [guía oficial de JWT bearer para ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-jwt-bearer-authentication?view=aspnetcore-10.0) separa correctamente la adquisición del token de su validación en la API.

Los refresh tokens pertenecen al cliente autorizado para renovar la sesión, no a cada API. Deben rotarse, poder revocarse y almacenarse según el tipo de cliente. En un browser preferiría un backend-for-frontend con cookie segura, `HttpOnly` y `SameSite` apropiado antes que dejar credenciales de larga vida disponibles a cualquier JavaScript que logre ejecutarse.

Claims describen al sujeto. Las policies expresan reglas de acceso:

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Invoices.Read", policy =>
        policy.RequireClaim("permission", "invoices.read"));
});

app.MapGet("/invoices/{id}", GetInvoice)
   .RequireAuthorization("Invoices.Read");
```

Pero autorizar el endpoint no siempre autoriza el recurso. El usuario puede tener `invoices.read` y aun así no poder leer **esa** factura. La comprobación debe incluir tenant, propietario, región o regla de negocio correspondiente.

Los roles sirven para agrupaciones gruesas; las policies y handlers permiten reglas más expresivas. También protegería HTTPS, rotación de claves y secretos, rate limiting, auditoría, CORS estricto y CSRF cuando se usan cookies. CORS no es autorización. Un atacante no suele abandonar porque el preflight lo miró mal.

**Lo que delata seniority:** separar autenticación, autorización y sesión; entender dónde vive cada token y reconocer que un JWT válido todavía puede no tener permiso sobre el recurso solicitado.

## 7. Transient, Scoped y Singleton: ¿qué puede salir mal?

- **Transient:** una instancia cada vez que el contenedor resuelve el servicio.
- **Scoped:** una instancia por scope; en una API, normalmente una por request.
- **Singleton:** una instancia para toda la vida del proceso.

El error clásico es el *captive dependency*: un singleton captura un servicio scoped. Puede retener el primer `DbContext`, reutilizar datos de una request en otra, acceder a objetos ya dispuestos o introducir concurrencia donde el servicio nunca fue diseñado para soportarla.

Un `BackgroundService` es singleton y no recibe automáticamente un scope por mensaje. Debe crearlo:

```csharp
public sealed class InvoiceWorker(
    IServiceScopeFactory scopeFactory,
    Channel<InvoiceJob> queue) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (InvoiceJob job in
            queue.Reader.ReadAllAsync(stoppingToken))
        {
            await using AsyncServiceScope scope =
                scopeFactory.CreateAsyncScope();

            InvoiceProcessor processor =
                scope.ServiceProvider.GetRequiredService<InvoiceProcessor>();

            await processor.ProcessAsync(job, stoppingToken);
        }
    }
}
```

Así cada trabajo obtiene su propio contexto y sus dependencias scoped. La [documentación de hosted services](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services?view=aspnetcore-10.0) describe el mismo principio.

Un singleton debe ser thread-safe y no contener estado específico del usuario. Un transient pesado puede crear presión de memoria si se construye miles de veces o registra callbacks que nunca libera. Y un scoped no significa “por usuario”: dos requests simultáneas del mismo usuario tienen scopes distintos.

**Lo que delata seniority:** hablar del dueño y la vida útil del estado, no sólo recitar tres definiciones que caben en la primera pantalla de la documentación.

## 8. Procesamiento en background de alto throughput

`BackgroundService` es una buena unidad de ejecución, pero no convierte la memoria del proceso en una cola durable.

Para tareas descartables o reconstruibles, un `Channel<T>` acotado funciona bien: ofrece productores y consumidores asíncronos, backpressure y control explícito de capacidad. Para trabajo de negocio que no puede perderse —cobros, facturas, importaciones— usaría un broker durable o una tabla de trabajos con locking/leases.

El diseño necesita responder:

- ¿qué ocurre si el proceso muere después de aplicar el efecto pero antes de confirmar el mensaje?
- ¿cuántos trabajos pueden ejecutarse a la vez sin derribar la base o la API vecina?
- ¿qué excepciones son transitorias y cuáles permanentes?
- ¿cómo se cancela y cuánto tiempo tiene para terminar durante un deploy?
- ¿cómo encontramos un mensaje que falló veinte veces?

Asumiría entrega *at least once* y haría idempotente al consumidor. Controlaría concurrencia con una cantidad fija de workers o un `SemaphoreSlim`, pero el número saldría de mediciones y límites de dependencias. Duplicar workers no duplica throughput si todos esperan el mismo lock de la base.

Los retries tendrían backoff, jitter y límite. Después, el mensaje iría a dead-letter con suficiente contexto para investigarlo y reintentarlo deliberadamente. Una DLQ sin alerta ni herramienta de replay es apenas un cementerio prolijo.

Propagaría `CancellationToken`, dejaría de aceptar trabajo durante el shutdown y esperaría lo que permita el presupuesto de apagado. Mediría profundidad y edad de cola, throughput, duración, retries, fallas definitivas y saturación por dependencia.

Y nunca lanzaría un `Task.Run` desde un controller para “seguir después” con datos scoped de la request. La respuesta puede llegar rápido; el bug también, sólo que sin tracking.

**Lo que delata seniority:** diseñar para duplicados, pérdida del proceso y backpressure. El camino feliz ya suele venir incluido.

## 9. El deploy produce errores 500 intermitentes, pero desarrollo funciona

Lo trataría como un incidente de release. Primero correlacionaría errores con versión, instancia, zona, endpoint, tenant y tipo de request. “Intermitente” muchas veces significa “una de seis réplicas tiene otra configuración” o “sólo falla el caso que no existe en nuestros datos locales”.

Compararía artefactos inmutables, variables de entorno, secretos, permisos, certificados, zona horaria, cultura, filesystem, límites de CPU/memoria, versión de runtime y conectividad. Verificaría que todas las instancias ejecuten la misma imagen por digest, no sólo una etiqueta optimista como `latest`.

Los logs deberían ser estructurados y llevar correlation/trace ID, versión del release e instancia. Una traza distribuida mostraría si el 500 nace en nuestra API o es traducción de un timeout aguas abajo. Revisaría excepciones completas sin exponer secretos, health checks, reinicios del contenedor, OOM kills, throttling y estado de pools.

También preguntaría si el despliegue cambió el esquema de base de forma incompatible. En rolling deployments conviven dos versiones: una migración destructiva puede romper a la vieja mientras la nueva todavía está arrancando. Expand-and-contract existe porque producción no tiene botón de pausa dramática.

Si el error empezó con el release y hay impacto, rollback, feature flag o desvío de tráfico. Después se investiga con la evidencia preservada. Corregir manualmente una réplica por SSH crea una edición especial de producción que nadie podrá reproducir.

A futuro: canary releases, smoke tests contra infraestructura real, validación de configuración al inicio, dashboards por versión y runbooks breves. “Funciona en mi máquina” sólo demuestra que el problema tuvo la delicadeza de viajar solo.

**Lo que delata seniority:** priorizar recuperación y acotar el radio de búsqueda antes de cambiar cinco cosas simultáneamente.

## 10. Diseñá un SaaS multi-tenant con ASP.NET Core y EF Core

Primero elegiría el nivel de aislamiento según riesgo, regulación, volumen y operación:

- **columna `TenantId` en una base compartida:** simple y eficiente, pero exige defensas sistemáticas contra fugas;
- **base por tenant:** mejor aislamiento, restore y escalado individual, a cambio de provisión y migraciones más complejas;
- **híbrido:** tenants pequeños compartidos y tenants grandes o regulados en bases dedicadas.

EF Core documenta tanto el [modelo por discriminador como database-per-tenant](https://learn.microsoft.com/en-us/ef/core/miscellaneous/multitenancy). Para una base compartida agregaría un filtro global:

```csharp
public sealed class AppDbContext(
    DbContextOptions<AppDbContext> options,
    CurrentTenant tenant) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Order>()
            .HasQueryFilter(order => order.TenantId == tenant.Id);
    }
}
```

Es una defensa útil, no un campo de fuerza. `IgnoreQueryFilters()`, SQL crudo, código administrativo y errores al insertar siguen existiendo. El `TenantId` debe resolverse desde identidad validada o un host mapeado; nunca confiaría en el valor enviado en el body. Al crear entidades, el servidor asigna el tenant.

La autorización también verifica tenant y recurso. Todas las claves de caché, blobs, índices de búsqueda, nombres de cola y métricas deben incluir el contexto del tenant. Una cache key `customer:42` sin tenant es una fuga esperando que alguien tenga un mal martes.

Si usamos `DbContext` pooling, el tenant no puede quedar pegado a una instancia reutilizada. Para database-per-tenant, un resolvedor elige la connection string y las migraciones se ejecutan como una operación coordinada, observable y reanudable. No migraría diez mil bases durante el startup de la API con la esperanza como estrategia de scheduling.

Agregaría auditoría con tenant, actor, operación y correlation ID; cuotas para noisy neighbors; pruebas automáticas negativas que intenten cruzar tenants; y roles administrativos separados, explícitos y auditados. El test más valioso no es “el usuario A ve su factura”, sino “el usuario A **jamás** puede ver la factura de B por ninguna ruta”.

**Lo que delata seniority:** tratar el aislamiento como una propiedad transversal. Poner `TenantId` en tres entidades no vuelve multi-tenant al sistema; apenas le agrega una columna repetida.

## Entonces, ¿cómo se responde una entrevista así?

No intentaría pronunciar este artículo completo frente a una persona que probablemente tiene otra reunión en cuarenta minutos. Usaría una estructura breve:

1. aclarar contexto y restricciones;
2. proponer una opción inicial concreta;
3. explicar dos o tres trade-offs;
4. contar cómo la validaría con métricas, tests u operación;
5. mencionar una falla realista y cómo limitaría su impacto.

Una buena entrevista técnica no debería medir cuántos sustantivos ingleses podemos encadenar sin respirar. Debería revelar cómo pensamos cuando faltan datos, cómo elegimos una solución proporcional y qué hacemos cuando la realidad se niega a leer nuestro diagrama.

El seniority no consiste en conocer una arquitectura que sirve para todo. Consiste, entre otras cosas, en haber aprendido que esa arquitectura no existe.

Y en decirlo antes de crear diecisiete microservicios.

---

**Fuentes consultadas:**

- Microsoft Learn: [política de soporte y versiones de .NET](https://learn.microsoft.com/en-us/dotnet/core/releases-and-support).
- Microsoft Learn: [diagnóstico de ThreadPool starvation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-threadpool-starvation).
- Microsoft Learn: [distributed tracing en .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing).
- Microsoft Learn: [rendimiento de EF Core](https://learn.microsoft.com/en-us/ef/core/performance/).
- Microsoft Learn: [resiliencia HTTP en .NET](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience).
- Microsoft Learn: [configuración de JWT bearer en ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-jwt-bearer-authentication?view=aspnetcore-10.0).
- Microsoft Learn: [hosted services y tareas en background](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services?view=aspnetcore-10.0).
- Microsoft Learn: [multi-tenancy con EF Core](https://learn.microsoft.com/en-us/ef/core/miscellaneous/multitenancy).
