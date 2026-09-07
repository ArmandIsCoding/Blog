---
title: "REST no es JSON con verbos prolijos* (*y poner _links tampoco alcanza)"
description: "Qué definió realmente Roy Fielding, por qué una API HTTP con recursos y JSON no necesariamente es REST, qué papel cumplen las representaciones y la hipermedia, y cuándo no vale la pena fingir."
publishedAt: 2026-09-07T12:00:00-03:00
tags:
  - arquitectura
  - apis
  - http
  - rest
  - dotnet
draft: true
---

REST puede hablar XML.

No es una provocación retro ni el comienzo de una campaña para resucitar `DataSet`. Una arquitectura REST puede intercambiar XML, HTML, JSON, CSV, SVG, imágenes o cualquier otro media type que sus participantes sepan procesar.

De hecho, Roy Fielding publicó la tesis que define REST en el año 2000, **seis años antes de que `application/json` tuviera su primer RFC**. Una respuesta como ésta podría ser perfectamente REST:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.example.order+xml
Cache-Control: private, max-age=60
```

```xml
<order number="8472" status="pending">
  <total currency="USD">149.90</total>
  <link rel="self" href="/orders/8472" />
  <action rel="payment" method="POST" href="/payments" />
  <action rel="cancel" method="POST" href="/order-cancellations" />
</order>
```

Ese XML anticuado, ofensivo para cualquier slide de arquitectura posterior a 2015, está bastante más cerca de REST que miles de endpoints JSON perfectamente indentados. Identifica un recurso, transfiere una representación, declara cómo puede reutilizarse y contiene las transiciones disponibles para el cliente.

También conviene recordar la Internet para la que se pensó todo esto.

En 2000 la banda ancha apenas despegaba. No predominaba el ADSL: el dial-up seguía siendo la experiencia habitual para muchísima gente, mientras DSL y cable empezaban a expandirse. La [FCC citaba estimaciones cercanas al 80 % de hogares estadounidenses conectados por dial-up todavía a fines de 2001](https://docs.fcc.gov/public/attachments/fcc-02-338a1.pdf), y en los países de la OCDE [la cantidad de conexiones de banda ancha recién superó al dial-up en 2004](https://www.oecd.org/content/dam/oecd/en/publications/reports/2008/06/broadband-growth-and-policies-in-oecd-countries_g1gh9366/9789264046764-en.pdf).

La latencia era tangible, las desconexiones no tenían nada de excepcional y cada viaje por la red costaba. Establecer una comunicación y recibir una respuesta era una oportunidad demasiado valiosa para volver solamente con tres campos y la obligación de consultar un manual para saber qué pedir después.

Una representación útil debía traer información, metadata, reglas de caché y caminos posibles. Durante el tiempo permitido por esas reglas, el cliente obtenía algo parecido a una **autonomía transitoria** sobre la representación: podía conservarla, interpretarla, mostrarla, seguir sus enlaces o revalidarla. No se convertía en dueño del recurso del servidor; se convertía en dueño de su estado de aplicación y de la copia que había recibido.

Fielding lo expresa en términos de eficiencia de red: una respuesta cacheable concede al caché del cliente el derecho a reutilizarla en requests equivalentes. Y concentra el estado de control en las representaciones recibidas para que el servidor no tenga que recordar al cliente más allá de la request actual.

Por eso REST no se trataba simplemente de mover datos. Se trataba de enviar una porción suficientemente rica del sistema para que el cliente pudiera continuar sin una conversación invisible guardada del otro lado.

Ahora sí, saltemos veintiséis años.

Hay un momento en la vida de casi toda API en el que alguien cambia `CreateCustomer` por `POST /customers`, reemplaza XML por JSON y declara solemnemente:

> Ahora somos RESTful.

Si además devuelve `201 Created`, se percibe en la sala una madurez arquitectónica difícil de describir.

Hoy llamamos REST a casi cualquier interfaz que viaje sobre HTTP, entregue JSON y no tenga demasiados verbos en la URL. Si los endpoints están ordenados en un *resource tree* y Swagger muestra varios colores, hablamos directamente de “REST nivel enterprise”.

El pequeño inconveniente es que REST ya tenía un significado.

Fielding describió REST, en el capítulo 5 de su tesis doctoral, como un **estilo arquitectónico para sistemas hipermedia distribuidos**. No como un estándar para APIs JSON. No como una receta CRUD. No como una convención para decidir si `users` va en plural.

Y la parte que casi siempre dejamos afuera —hipermedia como motor del estado de la aplicación— no es un accesorio avanzado. Es una de las restricciones que definen el estilo.

Así que hagamos algo bastante subversivo: antes de decir REST por centésima vez, veamos qué significa.

## REST no es un protocolo, una especificación ni un formato

REST significa **Representational State Transfer**. Es un estilo arquitectónico: un conjunto de restricciones elegidas porque, aplicadas en conjunto, producen ciertas propiedades deseables.

Fielding no empezó con una lista de features. Partió de un sistema sin restricciones y fue agregándolas para obtener escalabilidad, visibilidad, simplicidad, independencia entre componentes y capacidad de evolución a escala de Internet.

Eso importa porque las restricciones tienen costos. La interfaz uniforme, por ejemplo, favorece el desacoplamiento y permite que intermediarios entiendan los mensajes, pero puede ser menos eficiente que una interfaz hecha a medida para cada operación. REST no promete almuerzo gratis. Promete un menú predecible que puede ser servido por organizaciones que ni siquiera se conocen.

HTTP encaja extraordinariamente bien con REST porque ambos fueron desarrollados en relación con la arquitectura de la Web. Pero REST no es sinónimo de HTTP, y HTTP puede utilizarse para construir sistemas que no son REST.

También se desprenden algunas noticias inquietantes:

- REST no exige JSON;
- REST no exige CRUD;
- REST no exige URLs “bonitas”;
- REST no exige que los recursos sean tablas o entidades;
- usar `GET`, `POST`, `PUT` y `DELETE` correctamente no alcanza;
- y OpenAPI puede describir perfectamente una API que no tiene nada de REST.

JSON es un formato de datos. HTTP es un protocolo. REST es un estilo arquitectónico. Son tres cosas distintas, aunque en muchas reuniones viajen amontonadas en el mismo PowerPoint.

## Recursos: algo más abstracto que una fila de la base

En REST, el concepto central es el **recurso**. Un recurso es cualquier cosa que merezca ser identificada: un documento, una persona, la colección de pedidos pendientes, el estado del clima en Córdoba, el resultado de una búsqueda o el proceso de aprobación de una factura.

No tiene que corresponder a una tabla. Ni siquiera tiene que ser algo almacenado. Puede ser una relación o un cálculo que cambia con el tiempo.

```text
https://api.example.com/orders/8472
https://api.example.com/orders?status=pending
https://api.example.com/reports/sales/today
```

Cada URI identifica un recurso. Pero lo que viaja por la red no es el recurso: viaja una **representación** de su estado.

El mismo recurso podría representarse como HTML, JSON, XML, CSV o una imagen, según sus capacidades y lo que negocien cliente y servidor:

```http
GET /weather/cordoba HTTP/1.1
Host: example.com
Accept: text/html
```

```http
GET /weather/cordoba HTTP/1.1
Host: example.com
Accept: application/json
```

No pedimos dos recursos diferentes. Pedimos dos representaciones del mismo recurso.

Esta separación permite ocultar la implementación. El cliente conoce identificadores, representaciones y semántica de interacción; no debería necesitar saber si detrás hay PostgreSQL, un archivo, tres microservicios o un pasante actualizando un Excel con admirable puntualidad.

## ¿Qué estado se transfiere exactamente?

El nombre *Representational State Transfer* suele generar una explicación circular: “es la transferencia del estado representacional”. Muchas gracias por venir.

Hay dos estados que conviene distinguir:

- **estado del recurso:** vive del lado del servidor; por ejemplo, un pedido está pendiente de pago;
- **estado de la aplicación:** describe dónde se encuentra el cliente dentro de su interacción; por ejemplo, acaba de consultar el pedido y puede pagarlo o cancelarlo.

El servidor transfiere una representación que describe el recurso y ofrece posibles transiciones. El cliente elige una de ellas y avanza a otro estado de la aplicación.

La Web común lo hace todo el tiempo. Entramos a una página desde un bookmark, recibimos HTML, vemos enlaces y formularios, elegimos uno, enviamos una request y recibimos una nueva representación con nuevas posibilidades.

No memorizamos que para comprar un libro hay que construir manualmente:

```text
/catalog/products/{sku}/purchase?warehouse=central
```

Seguimos el enlace o completamos el formulario que el servidor nos presentó. Si la tienda reorganiza sus URLs, un navegador no necesita ser recompilado.

Ésa es la idea que la mayoría de las llamadas “REST APIs” abandona justo antes de imprimir las remeras.

## Las restricciones que sí definen REST

La [tesis de Fielding](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) deriva REST mediante seis restricciones. Cinco son obligatorias; la última es opcional.

### 1. Cliente-servidor

La interfaz separa las responsabilidades del cliente y del servidor. El cliente se ocupa de la experiencia y del estado de su aplicación; el servidor administra recursos y capacidades.

Esa separación permite que ambos evolucionen de forma independiente. Un navegador no conoce la base de datos de cada sitio y un sitio no necesita saber cómo cada dispositivo dibuja un botón.

Esto parece obvio hoy porque la Web ganó. Las buenas ideas tienen el problema de que, después de conquistar el mundo, parecen haber estado siempre ahí.

### 2. Stateless

Cada request debe contener toda la información necesaria para que el servidor pueda entenderla. El servidor no debería depender de una conversación guardada en memoria para interpretar el siguiente mensaje.

Stateless **no significa que el servidor no tenga estado**. Si así fuera, nuestra tienda olvidaría los pedidos y sería muy escalable durante sus breves minutos de existencia.

El servidor conserva estado de recursos. Lo que no conserva es contexto de sesión necesario para reconstruir qué quiso decir el cliente:

```http
# Acoplado a una sesión almacenada en un servidor concreto
POST /next-step
Cookie: SessionId=abc123

# La request lleva el contexto necesario
POST /orders/8472/payment
Authorization: Bearer eyJ...
Content-Type: application/json

{"paymentMethod":"card-19"}
```

Esto mejora visibilidad, confiabilidad y escalabilidad: una request puede ser atendida por otra instancia sin trasladar una conversación secreta. El costo es repetir información y obligar al cliente a mantener su estado de aplicación.

Un token no vuelve REST a una API automáticamente. Puede ayudar a una interacción stateless, pero todavía quedan unas cuantas restricciones esperando afuera.

### 3. Cache

Las respuestas deben indicar si pueden reutilizarse. La caché no es un plugin opcional que agregamos cuando producción empieza a humear; es una restricción explícita del estilo.

HTTP ofrece un vocabulario rico para esto:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.example.order+json
Cache-Control: private, max-age=60
ETag: "order-8472-v12"
```

Luego el cliente puede validar su copia:

```http
GET /orders/8472 HTTP/1.1
If-None-Match: "order-8472-v12"
```

```http
HTTP/1.1 304 Not Modified
```

No hubo que transferir otra vez la representación. Además, proxies, CDNs y otros intermediarios pueden participar porque el mensaje describe su semántica de caché.

Responder siempre `Cache-Control: no-store` quizá sea correcto para cierta información sensible. Responderlo en cada endpoint porque nadie quiso pensar en caché es técnicamente explícito, aunque arquitectónicamente se parezca a resolver ventilación abriendo todas las ventanas en invierno.

### 4. Interfaz uniforme

Ésta es, según Fielding, la característica central que distingue REST de otros estilos de red.

En lugar de inventar una interfaz específica para cada servicio —`ApproveInvoice`, `DeactivateUser`, `MoveMoney`— los componentes interactúan mediante una interfaz general y consistente. En HTTP, esa interfaz incluye métodos con semántica compartida, URIs, status codes, headers, media types, caché y negociación de contenido.

La interfaz uniforme tiene cuatro restricciones internas:

1. identificación de recursos;
2. manipulación mediante representaciones;
3. mensajes autodescriptivos;
4. hipermedia como motor del estado de la aplicación.

Las primeras tres sobreviven bastante bien en nuestras APIs. La cuarta suele aparecer en una diapositiva llamada “opcional / futuro”. El detalle incómodo es que no es opcional.

### 5. Sistema en capas

Un cliente sólo necesita conocer la capa con la que interactúa. No sabe si está hablando con el servidor final, un reverse proxy, un gateway, un balanceador, un caché o una capa de seguridad.

Esto permite introducir intermediarios para escalar, proteger, transformar o encapsular sistemas legacy. También agrega latencia y complejidad: otra vez, REST describe trade-offs, no unicornios.

### 6. Code on demand —opcional—

El servidor puede extender la funcionalidad del cliente enviándole código ejecutable. JavaScript en un navegador es el ejemplo evidente; los applets eran un ejemplo más evidente en el año 2000 y una advertencia evidente algunos años después.

Es la única restricción opcional porque mejora extensibilidad pero reduce visibilidad: ya no basta con observar datos, también hay que entender el código descargado.

## La interfaz uniforme, sin sahumerios

Vale la pena detenerse en sus cuatro partes porque allí vive casi toda la confusión.

### Identificación de recursos

Cada recurso relevante tiene un identificador estable. En HTTP normalmente es una URI.

El identificador no debe revelar cómo se almacena el recurso. `/orders/8472` puede terminar consultando una tabla hoy y un servicio remoto mañana. Tampoco tiene que llevar sustantivos por obligación: la semántica de una URI es opaca para el cliente.

Una URL “linda” ayuda a humanos, logs y soporte. No es lo que la vuelve REST.

### Manipulación mediante representaciones

El cliente recibe o envía representaciones y utiliza la interfaz uniforme para actuar sobre el recurso.

`GET` obtiene una representación. `PUT` solicita reemplazar las representaciones actuales del recurso con el contenido enviado. `DELETE` solicita eliminar las representaciones actuales del recurso. `POST` pide que el recurso procese el contenido según su propia semántica.

Notemos que HTTP no dice CRUD. `POST` no significa “Create” y `PUT` no significa “Update”. A veces producen esos efectos, pero su semántica es más general.

El [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) define además propiedades que habilitan comportamiento automático:

- `GET`, `HEAD`, `OPTIONS` y `TRACE` son seguros: el cliente no solicita un cambio de estado;
- `PUT`, `DELETE` y los métodos seguros son idempotentes: repetir una request equivalente debería tener el mismo efecto pretendido;
- que un método sea idempotente no significa que todas sus respuestas sean idénticas ni que el servidor no registre auditoría.

Si `GET /users/42/delete` borra al usuario, el endpoint no se salva porque tiene un sustantivo en plural. Rompe la semántica que crawlers, caches y clientes tienen derecho a asumir.

### Mensajes autodescriptivos

Cada mensaje contiene suficiente información para que sus participantes e intermediarios entiendan cómo procesarlo: método, URI, status code, headers, media type y contenido.

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json
Cache-Control: no-store

{
  "type": "https://example.com/problems/order-already-shipped",
  "title": "El pedido ya fue despachado",
  "status": 409,
  "instance": "/orders/8472"
}
```

Un `200 OK` con `{ "success": false }` desperdicia semántica uniforme y obliga a que cada consumidor aprenda un protocolo privado escondido dentro de JSON.

`application/json` sólo enseña a parsear JSON. No explica qué significa `status`, si `actions` contiene transiciones ni cómo interpretar `customer`. Para una interacción realmente hipermedia, el cliente necesita un media type con un modelo de procesamiento conocido o relaciones bien definidas.

### Hipermedia como motor del estado de la aplicación

HATEOAS —*Hypermedia As The Engine Of Application State*— significa que las transiciones disponibles llegan dentro de las representaciones, como enlaces, formularios o controles hipermedia.

El cliente comienza con una URI inicial y conocimiento de media types y relaciones. A partir de ahí sigue opciones ofrecidas por el servidor. No debería construir URLs internas ni ejecutar una coreografía aprendida de una documentación fuera de banda.

Fielding fue especialmente terminante en su artículo de 2008, [“REST APIs must be hypertext-driven”](https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven): si la API no es dirigida por hipertexto, no es RESTful.

No dijo “nivel dos y medio”. No dijo “REST pragmático”. Dijo que elijamos otro buzzword. Se ve que ya estaba teniendo una semana larga.

## Una orden sin hipermedia

Supongamos esta respuesta:

```http
GET /api/orders/8472 HTTP/1.1
Accept: application/json
```

```json
{
  "id": 8472,
  "status": "pending",
  "total": 149.90,
  "customerId": 31
}
```

Para pagarla, el cliente leyó la documentación y aprendió a construir:

```http
POST /api/orders/8472/pay
```

Para cancelarla:

```http
POST /api/orders/8472/cancel
```

Es una API HTTP orientada a recursos bastante razonable. Usa JSON, URIs, métodos y probablemente status codes. Pero el flujo de la aplicación vive fuera de las representaciones. El cliente conoce la estructura de URLs y las transiciones por un manual.

Si el servidor cambia `/pay` por `/payments`, hay que actualizar consumidores. Si una orden despachada no puede cancelarse, el cliente debe duplicar esa regla o intentar la operación y descubrirlo. El servidor entrega datos; la documentación entrega la aplicación.

Eso no es hipermedia como motor del estado. Es un SDK imaginario operado a mano.

## La misma orden dirigida por hipermedia

Ahora la respuesta utiliza un media type conocido por el cliente y ofrece las transiciones disponibles:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.example.order+json
```

```json
{
  "number": "8472",
  "status": "pending",
  "total": {
    "amount": 149.90,
    "currency": "USD"
  },
  "links": [
    {
      "rel": "self",
      "href": "https://api.example.com/orders/8472"
    },
    {
      "rel": "customer",
      "href": "https://api.example.com/people/31"
    }
  ],
  "actions": [
    {
      "rel": "payment",
      "href": "https://api.example.com/payments",
      "method": "POST",
      "contentType": "application/vnd.example.payment+json",
      "fields": ["paymentMethodId"]
    },
    {
      "rel": "cancel",
      "href": "https://api.example.com/order-cancellations",
      "method": "POST",
      "fields": ["reason"]
    }
  ]
}
```

El cliente busca relaciones que comprende. No supone dónde vive el cliente asociado ni concatena `/pay`. El servidor puede mover esos recursos y entregar las nuevas URIs.

Cuando la orden se despacha, la representación deja de ofrecer `cancel`. La transición no está disponible en ese estado:

```json
{
  "number": "8472",
  "status": "shipped",
  "links": [
    {
      "rel": "self",
      "href": "https://api.example.com/orders/8472"
    },
    {
      "rel": "tracking",
      "href": "https://shipping.example.net/track/ZX-91"
    }
  ],
  "actions": []
}
```

La representación conduce la aplicación. Puede incluso enlazar otro dominio: una URI identifica; no promete vivir debajo del mismo árbol genealógico.

Las relaciones tienen semántica. `self`, `next`, `prev`, `alternate` y muchas otras están registradas; [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288.html) define Web Linking y distingue claramente la relación del formato de la representación destino. Para vocabulario específico del dominio pueden definirse relaciones de extensión.

## Poner `_links` no alcanza

Agregar enlaces es necesario para hipermedia, pero no todo objeto con `_links` se vuelve REST por contacto.

Si el cliente ignora esos controles y sigue construyendo `/orders/{id}/cancel`, la aplicación no es dirigida por hipermedia. Los enlaces son decoración arquitectónica, como una bicicleta fija usada para colgar ropa.

Tampoco alcanza con esto:

```json
{
  "_links": {
    "thing": "/api/x/19"
  }
}
```

¿Qué significa `thing`? ¿Se consulta con `GET`? ¿Se modifica? ¿Es el cliente, el pago o una foto del perro del encargado? Una relación sólo ayuda si su semántica es conocida.

Y si la API devuelve `application/json`, pero espera que el consumidor conozca una estructura privada de campos y acciones, el mensaje no se vuelve autodescriptivo mágicamente. El cliente posee información fuera de banda. Puede ser una decisión perfectamente práctica; simplemente no es el desacoplamiento que REST describe.

La hipermedia no elimina todo conocimiento previo. Un navegador ya conoce HTML, los métodos HTTP y relaciones como `stylesheet`; un cliente de una API debe conocer los media types y relaciones que soporta. La diferencia es **dónde se concentra el acoplamiento**:

- en una API convencional, el cliente conoce rutas, secuencias y estructuras particulares del servidor;
- en REST, conoce vocabularios y modelos de procesamiento, mientras cada representación le entrega las transiciones concretas disponibles ahora.

No es ausencia de contrato. Es un contrato diseñado para que el servidor pueda cambiar su espacio de URIs y su flujo sin reprogramar cada cliente.

## ¿Y el famoso resource tree?

`/customers/31/orders/8472/lines/2` puede ser una URL comprensible. También puede filtrar la estructura mental —o directamente relacional— del servidor hacia todos los consumidores.

Fielding sostiene que los servidores deben controlar su propio namespace y que los clientes no deberían depender de nombres o jerarquías fijas de recursos. Si para navegar una API el consumidor necesita un mapa impreso de todas las rutas, la navegación no está ocurriendo mediante hipermedia.

Esto no prohíbe diseñar URLs prolijas. Prohíbe hacer que el cliente dependa de conocerlas de antemano.

Una URI inicial documentada es normal:

```http
GET https://api.example.com/
```

La respuesta puede ofrecer puntos de entrada:

```json
{
  "links": [
    { "rel": "orders", "href": "/a/7f91" },
    { "rel": "customers", "href": "/directory/current" },
    { "rel": "help", "href": "https://docs.example.com/" }
  ]
}
```

Las URLs podrían ser horribles y el cliente seguiría funcionando. No recomiendo hacerlas horribles deliberadamente: los humanos también operamos sistemas. Sólo conviene recordar que REST no otorga puntos por estética de paths.

## El método HTTP no es maquillaje

Muchísimas APIs adoptaron los verbos correctos como una guía de estilo y olvidaron las propiedades que esos verbos comunican a toda la infraestructura.

```http
GET    /orders/8472
PUT    /orders/8472
DELETE /orders/8472
POST   /orders
```

Esto luce ordenado, pero su valor no está en parecer CRUD. Está en que clientes e intermediarios puedan razonar con semántica compartida.

Un retry automático sobre `PUT` puede ser razonable porque el método es idempotente. Un crawler puede seguir enlaces `GET` sin temer que uno liquide una cuenta. Un caché puede reutilizar una representación según headers y validadores. Un proxy puede entender una respuesta sin conocer nuestro dominio.

Cuando metemos todo dentro de `POST /execute` y respondemos siempre `200`, HTTP queda reducido a transporte. Seguimos teniendo una API. Incluso puede ser una excelente API RPC. Pero renunciamos voluntariamente a la interfaz uniforme y después reconstruimos parte de ella dentro de un JSON llamado `operationResult`.

Nada ilegal ocurrió. Sólo sería amable sacar “RESTful” de la documentación antes de que alguien haga preguntas.

## Un ejemplo mínimo en ASP.NET Core

ASP.NET Core no trae una casilla `UseRest()` porque REST no es middleware. Podemos, sin embargo, diseñar una representación que exponga transiciones de acuerdo con el estado:

```csharp
app.MapGet("/orders/{id:guid}", async (
    Guid id,
    HttpContext httpContext,
    OrdersDbContext db,
    LinkGenerator links,
    CancellationToken cancellationToken) =>
{
    Order? order = await db.Orders
        .AsNoTracking()
        .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    if (order is null)
    {
        return Results.NotFound();
    }

    var actions = new List<object>();

    if (order.Status is OrderStatus.Pending)
    {
        actions.Add(new
        {
            rel = "cancel",
            href = links.GetUriByName(
                httpContext,
                "CancelOrder",
                values: null),
            method = "POST",
            fields = new[] { "orderId", "reason" }
        });
    }

    return Results.Json(
        new
        {
            number = order.Number,
            status = order.Status.ToString().ToLowerInvariant(),
            total = order.Total,
            links = new[]
            {
                new
                {
                    rel = "self",
                    href = links.GetUriByName(
                        httpContext,
                        "GetOrder",
                        new { id = order.Id })
                }
            },
            actions
        },
        contentType: "application/vnd.example.order+json");
})
.WithName("GetOrder");
```

El ejemplo sólo muestra la idea. En un sistema real, el media type debe definir cómo interpretar enlaces, acciones, métodos y campos. Inventar una forma distinta en cada endpoint reemplazaría acoplamiento a URLs por acoplamiento a quince dialectos de JSON, un logro lateral.

También conviene notar que la acción de cancelar recibe un `orderId` en su contrato en lugar de obligar al cliente a deducirlo de una plantilla de URL. El `href` concreto proviene de la representación.

## Charlatanería REST: guía de campo

No toda imprecisión terminológica es un fraude. El lenguaje cambia, “REST API” se volvió una abreviatura industrial para “API HTTP orientada a recursos” y muchas personas se entienden perfectamente así.

La charlatanería empieza cuando usamos la palabra para afirmar propiedades que el diseño no tiene.

### “Es REST porque usa JSON”

JSON no incluye hipermedia, semántica de métodos, caché ni statelessness. Es una sintaxis para representar datos. También podría transportar instrucciones para una tostadora.

### “Es RESTful porque las URLs tienen sustantivos”

REST identifica recursos, sí. Pero no exige una convención gramatical ni que el cliente aprenda un árbol de rutas. `/getCustomer` puede ser un olor a RPC; `/customers/31` no demuestra el resto del estilo.

### “Usamos los cuatro verbos de REST”

Son métodos HTTP, no verbos de REST. Además existen `HEAD`, `OPTIONS`, `PATCH` y otros. Lo importante es respetar su semántica, no completar un álbum.

### “Es stateless porque usamos JWT”

Un JWT puede acompañar requests autosuficientes. También puede convivir con una sesión guardada, endpoints RPC, ausencia de caché y clientes acoplados a URLs. Aprobar una restricción no aprueba toda la materia.

### “Tenemos HATEOAS; mirá nuestro `_links`”

¿El cliente sigue los controles recibidos o usa rutas hardcodeadas? ¿Las relaciones tienen semántica? ¿La representación indica transiciones disponibles? Si no, `_links` es utilería.

### “No usamos HATEOAS porque somos REST pragmático”

Podemos ser pragmáticos y construir una API HTTP excelente. Lo que no podemos hacer es redefinir una restricción obligatoria como opcional y conservar el nombre original por razones de SEO.

### “Swagger demuestra que es REST”

OpenAPI describe operaciones y paths de una interfaz HTTP. Es útil, genera clientes y mejora muchísimo la vida de los equipos. Nada de eso prueba que el estado de la aplicación sea conducido por hipermedia. De hecho, un cliente generado suele quedar acoplado precisamente al catálogo de rutas documentado.

### “Más REST siempre es mejor”

REST optimiza ciertas propiedades bajo ciertas restricciones. No es una escala moral. Si dos servicios internos cambian juntos, requieren contratos fuertemente tipados y privilegian eficiencia, gRPC puede ser mejor. Si el dominio es naturalmente un grafo de consultas, GraphQL puede resultar más adecuado. Si enviamos comandos, RPC puede ser honesto y simple.

La peor API no es la que admite ser RPC. Es la que adopta ceremonias REST sin obtener los beneficios y obliga a todos a fingir que eso fue arquitectura.

## ¿Para qué sirve REST de verdad?

El estilo tiene especial sentido cuando necesitamos:

- muchos clientes desarrollados por organizaciones distintas;
- evolución independiente durante años;
- escala amplia y aprovechamiento de caches e intermediarios;
- descubrimiento de recursos y transiciones en tiempo de ejecución;
- una interfaz general que no exponga detalles de implementación;
- integración basada en vocabularios compartidos, no en SDKs obligatorios.

Es decir, problemas parecidos a los de la Web.

En una API privada para una aplicación móvil controlada por el mismo equipo, quizá el costo de diseñar media types hipermedia, relaciones y clientes adaptativos no se justifique. Es posible respetar HTTP, ofrecer recursos claros, buenos errores, idempotencia, documentación y caché sin afirmar que implementamos REST completo.

Llamarla **HTTP API**, **JSON API**, **resource-oriented API** o simplemente **API** no reduce su calidad. Al contrario: permite discutir sus propiedades reales sin pedirle prestigio prestado a una tesis que nadie en la reunión abrió.

## Una prueba rápida antes de decir REST

Podríamos hacernos estas preguntas:

1. ¿Cada request contiene el contexto necesario o depende de una sesión conversacional en el servidor?
2. ¿Las respuestas declaran correctamente sus posibilidades de caché?
3. ¿Los recursos están identificados independientemente de su implementación?
4. ¿Las representaciones y media types explican cómo procesar los mensajes?
5. ¿Respetamos la semántica de métodos, status codes y headers?
6. ¿El cliente descubre URIs y transiciones desde las representaciones?
7. ¿Puede el servidor cambiar su estructura de rutas sin recompilar consumidores?
8. ¿Los intermediarios pueden comprender lo necesario sin conocer reglas privadas del dominio?

Si la respuesta a la sexta es “no, pero tenemos un documento con todos los endpoints”, probablemente construimos una API HTTP convencional.

No hay que llamar a la policía de arquitectura. Sólo hay que describirla con honestidad.

## La Web era la demo

La ironía es que usamos REST todos los días en su forma más exitosa y después construimos “REST APIs” quitando justo aquello que hizo evolutiva a la Web.

Un navegador entra por una URI, comprende media types estandarizados, sigue enlaces, presenta formularios, negocia contenido, utiliza caches, atraviesa proxies y decide su próximo paso a partir de la representación recibida.

Una API típica entra con un PDF de 180 páginas, concatena strings para construir URLs, conoce de antemano la secuencia de cinco requests y rompe cuando `v1` se convierte en `v2`.

La primera fue diseñada para la evolución independiente.

La segunda tiene JSON con buenos modales.

Eso puede ser suficiente. Muchas veces lo es. Pero si vamos a llamarla REST, por lo menos deberíamos invitar a REST a la reunión.

---

**Fuentes consultadas:**

- Roy T. Fielding: [*Architectural Styles and the Design of Network-based Software Architectures*](https://ics.uci.edu/~fielding/pubs/dissertation/top.htm), tesis doctoral completa.
- Roy T. Fielding: [capítulo 5, *Representational State Transfer (REST)*](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm).
- Roy T. Fielding: [*REST APIs must be hypertext-driven*](https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven).
- IETF: [RFC 9110, *HTTP Semantics*](https://www.rfc-editor.org/rfc/rfc9110.html).
- IETF: [RFC 8288, *Web Linking*](https://www.rfc-editor.org/rfc/rfc8288.html).
- IETF: [RFC 4627, primera especificación de `application/json`](https://www.rfc-editor.org/rfc/rfc4627.html).
- IANA: [registro de media types](https://www.iana.org/assignments/media-types/).
- FCC: [*Review of Regulatory Requirements for Incumbent LEC Broadband Telecommunications Services*](https://docs.fcc.gov/public/attachments/fcc-02-338a1.pdf).
- OCDE: [*Broadband Growth and Policies in OECD Countries*](https://www.oecd.org/content/dam/oecd/en/publications/reports/2008/06/broadband-growth-and-policies-in-oecd-countries_g1gh9366/9789264046764-en.pdf).
