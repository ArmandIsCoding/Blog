---
title: "REST Is Not JSON with Tidy Verbs* (*and Adding _links Is Not Enough)"
description: "What Roy Fielding actually defined, why an HTTP API with resources and JSON is not necessarily REST, what representations and hypermedia are for, and when we should stop pretending."
publishedAt: 2026-09-07T13:00:00-03:00
tags:
  - architecture
  - apis
  - http
  - rest
  - dotnet
lang: en
translationKey: rest-actually-explained
draft: false
---

REST can speak XML.

That is not retro provocation, nor the beginning of a campaign to resurrect `DataSet`. A REST architecture can exchange XML, HTML, JSON, CSV, SVG, images, or any other media type its participants know how to process.

In fact, Roy Fielding published the dissertation that defines REST in 2000, **six years before `application/json` got its first RFC**. A response like this could be perfectly RESTful:

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

That antiquated XML—offensive to any architecture slide made after 2015—is considerably closer to REST than thousands of perfectly indented JSON endpoints. It identifies a resource, transfers a representation, declares how that representation may be reused, and carries the transitions available to the client.

It also helps to remember the Internet REST was designed for.

In 2000, broadband was barely getting started. ADSL did not dominate: dial-up was still the normal experience for a great many people while DSL and cable were beginning to spread. The [FCC cited estimates that roughly 80 percent of connected US households still used dial-up at the end of 2001](https://docs.fcc.gov/public/attachments/fcc-02-338a1.pdf), and across OECD countries [broadband subscriptions did not overtake dial-up until 2004](https://www.oecd.org/content/dam/oecd/en/publications/reports/2008/06/broadband-growth-and-policies-in-oecd-countries_g1gh9366/9789264046764-en.pdf).

Latency was tangible, disconnections were unremarkable, and every trip across the network had a cost. Successfully reaching a server and receiving a response was too valuable an opportunity to return with three fields and an obligation to consult a manual before knowing what to request next.

A useful representation should carry information, metadata, caching rules, and possible paths forward. For as long as those rules allowed, the client gained something resembling **temporary autonomy** over the representation: it could keep it, interpret it, render it, follow its links, or revalidate it. The client did not become the owner of the server's resource; it became the owner of its application state and of the copy it had received.

Fielding expresses this in terms of network efficiency: a cacheable response grants a client cache the right to reuse that response for equivalent requests. REST also concentrates control state in the received representations so the server does not need to remember the client beyond the current request.

REST, then, was not merely about moving data. It was about sending a sufficiently rich piece of the system for the client to continue without an invisible conversation stored on the other side.

Now let us jump forward twenty-six years.

There comes a moment in almost every API's life when someone replaces `CreateCustomer` with `POST /customers`, swaps XML for JSON, and solemnly announces:

> We are RESTful now.

If it also returns `201 Created`, the room experiences a degree of architectural maturity that is difficult to describe.

Today we call almost any interface REST as long as it travels over HTTP, returns JSON, and avoids too many verbs in its URLs. If its endpoints form a tidy resource tree and Swagger displays several colors, we may even call it “enterprise-grade REST.”

The small inconvenience is that REST already had a meaning.

Fielding described it in chapter 5 of his doctoral dissertation as an **architectural style for distributed hypermedia systems**. Not a standard for JSON APIs. Not a CRUD recipe. Not a convention for deciding whether `users` should be plural.

And the part we almost always leave out—hypermedia as the engine of application state—is not an advanced accessory. It is one of the constraints that define the style.

So let us do something mildly subversive: before saying REST for the hundredth time, let us find out what it means.

## REST is not a protocol, a specification, or a format

REST means **Representational State Transfer**. It is an architectural style: a set of constraints chosen because, when applied together, they produce desirable properties.

Fielding did not begin with a feature checklist. He started from a system with no constraints and added them one by one to obtain scalability, visibility, simplicity, component independence, and the ability to evolve at Internet scale.

That matters because constraints have costs. A uniform interface, for example, encourages decoupling and lets intermediaries understand messages, but it can be less efficient than an interface designed specifically for each operation. REST does not promise a free lunch. It promises a predictable menu that can be served by organizations that do not even know one another.

HTTP is an extraordinarily good fit for REST because both were developed in connection with the architecture of the Web. But REST is not synonymous with HTTP, and HTTP can be used to build systems that are not RESTful.

This leads to several unsettling pieces of news:

- REST does not require JSON;
- REST does not require CRUD;
- REST does not require “pretty” URLs;
- REST does not require resources to be tables or entities;
- using `GET`, `POST`, `PUT`, and `DELETE` correctly is not enough;
- and OpenAPI can perfectly describe an API that has nothing to do with REST.

JSON is a data format. HTTP is a protocol. REST is an architectural style. They are three different things, even if many meetings pack them onto the same PowerPoint slide.

## Resources: more abstract than a database row

The central concept in REST is the **resource**. A resource is anything worth identifying: a document, a person, the collection of pending orders, the current weather in Córdoba, a search result, or the approval process for an invoice.

It does not have to correspond to a table. It does not even have to be stored. It may be a relationship or a calculation that changes over time.

```text
https://api.example.com/orders/8472
https://api.example.com/orders?status=pending
https://api.example.com/reports/sales/today
```

Each URI identifies a resource. But the resource itself does not travel across the network: a **representation** of its state does.

The same resource could be represented as HTML, JSON, XML, CSV, or an image, depending on its capabilities and what client and server negotiate:

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

We did not request two different resources. We requested two representations of the same resource.

This separation hides implementation details. The client knows identifiers, representations, and interaction semantics; it should not need to know whether the other side contains PostgreSQL, a file, three microservices, or an intern updating Excel with admirable punctuality.

## Which state is being transferred?

The name *Representational State Transfer* often inspires circular explanations: “it transfers representational state.” Thank you for attending.

Two kinds of state are worth distinguishing:

- **resource state:** lives on the server; for example, an order is awaiting payment;
- **application state:** describes where the client is in its interaction; for example, it has just inspected the order and may pay or cancel it.

The server transfers a representation that describes the resource and offers possible transitions. The client chooses one and moves to another application state.

The ordinary Web does this constantly. We enter through a bookmark, receive HTML, see links and forms, choose one, send a request, and receive a new representation with new possibilities.

We do not memorize that buying a book requires manually constructing:

```text
/catalog/products/{sku}/purchase?warehouse=central
```

We follow the link or submit the form presented by the server. If the store reorganizes its URLs, a browser does not need to be recompiled.

That is the idea most so-called REST APIs abandon shortly before printing the T-shirts.

## The constraints that actually define REST

[Fielding's dissertation](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) derives REST through six constraints. Five are mandatory; the last is optional.

### 1. Client-server

The interface separates client and server responsibilities. The client handles the experience and its application state; the server manages resources and capabilities.

That separation allows both sides to evolve independently. A browser does not know the database behind every website, and a website does not need to know how each device draws a button.

This feels obvious now because the Web won. Good ideas suffer from a peculiar problem: once they conquer the world, they look as if they had always been there.

### 2. Stateless

Every request must contain all the information the server needs to understand it. The server should not depend on a conversation kept in memory to interpret the next message.

Stateless **does not mean the server has no state**. If it did, our store would forget every order and remain impressively scalable for its brief existence.

The server keeps resource state. What it does not keep is session context required to reconstruct what the client meant:

```http
# Coupled to a session stored on a particular server
POST /next-step
Cookie: SessionId=abc123

# The request carries the required context
POST /orders/8472/payment
Authorization: Bearer eyJ...
Content-Type: application/json

{"paymentMethod":"card-19"}
```

This improves visibility, reliability, and scalability: another instance can handle the request without moving a secret conversation along with it. The cost is repeated information and a client that must maintain its own application state.

A token does not make an API RESTful automatically. It may help create a stateless interaction, but several other constraints are still waiting outside.

### 3. Cache

Responses must state whether they may be reused. Caching is not an optional plugin installed when production begins to smoke; it is an explicit constraint of the style.

HTTP provides a rich vocabulary for this:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.example.order+json
Cache-Control: private, max-age=60
ETag: "order-8472-v12"
```

The client can later validate its copy:

```http
GET /orders/8472 HTTP/1.1
If-None-Match: "order-8472-v12"
```

```http
HTTP/1.1 304 Not Modified
```

The representation did not need to be transferred again. Proxies, CDNs, and other intermediaries can participate because the message describes its caching semantics.

Returning `Cache-Control: no-store` everywhere may be correct for sensitive information. Returning it on every endpoint because nobody wanted to think about caching is technically explicit, though architecturally similar to solving ventilation by opening every window in winter.

### 4. Uniform interface

According to Fielding, this is the central feature that distinguishes REST from other network styles.

Instead of inventing a service-specific interface—`ApproveInvoice`, `DeactivateUser`, `MoveMoney`—components interact through a general, consistent interface. In HTTP, that interface includes methods with shared semantics, URIs, status codes, headers, media types, caching, and content negotiation.

The uniform interface contains four constraints of its own:

1. identification of resources;
2. manipulation through representations;
3. self-descriptive messages;
4. hypermedia as the engine of application state.

The first three survive reasonably well in our APIs. The fourth tends to appear on a slide labeled “optional / future.” The uncomfortable detail is that it is not optional.

### 5. Layered system

A client only needs to know the layer it is interacting with. It does not know whether it is speaking to the origin server, a reverse proxy, a gateway, a load balancer, a cache, or a security layer.

This allows intermediaries to scale, protect, transform, or encapsulate legacy systems. It also adds latency and complexity: again, REST describes trade-offs, not unicorns.

### 6. Code on demand—optional

The server may extend client functionality by sending executable code. JavaScript in a browser is the obvious example; applets were an even more obvious example in 2000 and an even more obvious warning a few years later.

This is the only optional constraint because it improves extensibility while reducing visibility: observing data is no longer enough; downloaded code must also be understood.

## The uniform interface, without incense

Its four parts deserve a closer look because nearly all the confusion lives there.

### Identification of resources

Every relevant resource has a stable identifier. In HTTP, that is usually a URI.

The identifier should not reveal how the resource is stored. `/orders/8472` may query a table today and a remote service tomorrow. Nor must it contain nouns by decree: the semantics of a URI are opaque to the client.

A “nice” URL helps humans, logs, and support. That is not what makes it RESTful.

### Manipulation through representations

The client receives or sends representations and uses the uniform interface to act upon the resource.

`GET` retrieves a representation. `PUT` asks to replace the resource's current representations with the supplied content. `DELETE` asks to remove the resource's current representations. `POST` asks the resource to process content according to its own semantics.

Notice that HTTP does not say CRUD. `POST` does not mean “Create,” and `PUT` does not mean “Update.” They sometimes produce those effects, but their semantics are broader.

[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) also defines properties that enable automatic behavior:

- `GET`, `HEAD`, `OPTIONS`, and `TRACE` are safe: the client does not request a state change;
- `PUT`, `DELETE`, and safe methods are idempotent: repeating an equivalent request should have the same intended effect;
- an idempotent method need not produce identical responses, nor prevent the server from recording an audit trail.

If `GET /users/42/delete` deletes a user, the endpoint is not rescued by containing a plural noun. It violates semantics crawlers, caches, and clients are entitled to assume.

### Self-descriptive messages

Every message carries enough information for participants and intermediaries to understand how to process it: method, URI, status code, headers, media type, and content.

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json
Cache-Control: no-store

{
  "type": "https://example.com/problems/order-already-shipped",
  "title": "The order has already shipped",
  "status": 409,
  "instance": "/orders/8472"
}
```

A `200 OK` carrying `{ "success": false }` wastes uniform semantics and forces every consumer to learn a private protocol hidden inside JSON.

`application/json` only teaches a client how to parse JSON. It does not explain what `status` means, whether `actions` contains transitions, or how to interpret `customer`. A genuinely hypermedia interaction needs a media type with a known processing model or well-defined link relations.

### Hypermedia as the engine of application state

HATEOAS—*Hypermedia As The Engine Of Application State*—means available transitions arrive inside representations as links, forms, or other hypermedia controls.

The client begins with an initial URI plus knowledge of media types and relations. From that point, it follows choices offered by the server. It should not construct internal URLs or execute choreography learned from out-of-band documentation.

Fielding was especially blunt in his 2008 article, [“REST APIs must be hypertext-driven”](https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven): if an API is not driven by hypertext, it is not RESTful.

He did not say “level two and a half.” He did not say “pragmatic REST.” He said to choose another buzzword. Apparently he was having a long week already.

## An order without hypermedia

Consider this response:

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

To pay for it, the client read the documentation and learned to construct:

```http
POST /api/orders/8472/pay
```

To cancel it:

```http
POST /api/orders/8472/cancel
```

This is a perfectly reasonable resource-oriented HTTP API. It uses JSON, URIs, methods, and probably status codes. But the application flow lives outside the representations. The client knows the URL structure and the transitions from a manual.

If the server changes `/pay` to `/payments`, consumers must be updated. If a shipped order cannot be canceled, the client must duplicate that rule or attempt the operation and find out. The server delivers data; the documentation delivers the application.

That is not hypermedia as the engine of application state. It is an imaginary SDK operated by hand.

## The same order, driven by hypermedia

Now the response uses a media type known to the client and offers the transitions currently available:

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

The client looks for relations it understands. It does not assume where the associated customer lives or append `/pay`. The server may move those resources and supply the new URIs.

Once the order ships, the representation stops offering `cancel`. That transition is unavailable in the current state:

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

The representation drives the application. It may even link to another domain: a URI identifies something; it does not promise to live under the same family tree.

Relations have semantics. `self`, `next`, `prev`, `alternate`, and many others are registered; [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288.html) defines Web Linking and clearly distinguishes a link relation from the format of the target representation. Extension relations can define domain-specific vocabulary.

## Adding `_links` is not enough

Links are necessary for hypermedia, but not every object that touches `_links` becomes RESTful.

If the client ignores those controls and continues constructing `/orders/{id}/cancel`, the application is not driven by hypermedia. The links are architectural decoration, much like an exercise bike used as a clothes rack.

Nor is this sufficient:

```json
{
  "_links": {
    "thing": "/api/x/19"
  }
}
```

What does `thing` mean? Should it be retrieved with `GET`? Modified? Is it the customer, the payment, or a photograph of the manager's dog? A relation only helps when its semantics are known.

And if the API returns `application/json` while expecting consumers to know a private structure of fields and actions, the message does not magically become self-descriptive. The client holds out-of-band information. That may be a perfectly practical choice; it simply is not the decoupling REST describes.

Hypermedia does not eliminate all prior knowledge. A browser already understands HTML, HTTP methods, and relations such as `stylesheet`; an API client must understand the media types and relations it supports. The difference is **where coupling is concentrated**:

- in a conventional API, the client knows routes, sequences, and structures specific to the server;
- in REST, it knows vocabularies and processing models, while each representation supplies the concrete transitions available now.

This is not the absence of a contract. It is a contract designed so the server can change its URI space and flow without reprogramming every client.

## What about the famous resource tree?

`/customers/31/orders/8472/lines/2` may be an understandable URL. It may also leak the server's mental—or directly relational—structure into every consumer.

Fielding argues that servers must control their own namespace and clients should not depend on fixed resource names or hierarchies. If a consumer needs a printed map of every route to navigate an API, the navigation is not happening through hypermedia.

This does not forbid tidy URLs. It forbids making clients depend on knowing them in advance.

A documented initial URI is normal:

```http
GET https://api.example.com/
```

The response can offer entry points:

```json
{
  "links": [
    { "rel": "orders", "href": "/a/7f91" },
    { "rel": "customers", "href": "/directory/current" },
    { "rel": "help", "href": "https://docs.example.com/" }
  ]
}
```

Those URLs could be dreadful and the client would continue to work. I do not recommend making them dreadful on purpose—humans operate systems too. It is merely worth remembering that REST awards no points for attractive paths.

## The HTTP method is not makeup

Many APIs adopted the correct verbs as a style guide and forgot the properties those verbs communicate to the entire infrastructure.

```http
GET    /orders/8472
PUT    /orders/8472
DELETE /orders/8472
POST   /orders
```

This looks orderly, but its value does not come from resembling CRUD. Its value comes from clients and intermediaries reasoning through shared semantics.

An automatic retry of `PUT` can be reasonable because the method is idempotent. A crawler can follow `GET` links without fearing that one will close an account. A cache can reuse a representation according to headers and validators. A proxy can understand a response without knowing our domain.

When we put everything inside `POST /execute` and always answer `200`, HTTP is reduced to transport. We still have an API. It may even be an excellent RPC API. But we voluntarily gave up the uniform interface and then rebuilt parts of it inside a JSON object called `operationResult`.

Nothing illegal happened. It would simply be kind to remove “RESTful” from the documentation before someone asks questions.

## A minimal ASP.NET Core example

ASP.NET Core does not provide a `UseRest()` checkbox because REST is not middleware. We can, however, design a representation that exposes transitions according to the current state:

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

The example only demonstrates the idea. In a real system, the media type must define how to interpret links, actions, methods, and fields. Inventing a different shape for every endpoint would replace URL coupling with coupling to fifteen dialects of JSON—a lateral achievement.

Notice also that the cancel action receives `orderId` in its contract rather than forcing the client to extract it from a URL template. The concrete `href` comes from the representation.

## REST charlatanism: a field guide

Not every loose use of terminology is fraud. Language changes, “REST API” has become industry shorthand for “resource-oriented HTTP API,” and many people understand each other perfectly well that way.

Charlatanism begins when we use the term to claim properties the design does not possess.

### “It is REST because it uses JSON”

JSON provides no hypermedia, method semantics, caching, or statelessness. It is syntax for representing data. It could also carry instructions for a toaster.

### “It is RESTful because the URLs contain nouns”

REST identifies resources, yes. But it prescribes no grammatical convention and does not require clients to learn a route tree. `/getCustomer` may smell like RPC; `/customers/31` proves none of the remaining constraints.

### “We use the four REST verbs”

They are HTTP methods, not REST verbs. There are also `HEAD`, `OPTIONS`, `PATCH`, and others. Respecting their semantics matters more than completing the sticker album.

### “It is stateless because we use JWT”

A JWT may accompany self-contained requests. It may also coexist with stored sessions, RPC endpoints, no caching, and clients coupled to URLs. Passing one constraint does not pass the entire course.

### “We have HATEOAS; look at our `_links`”

Does the client follow the received controls or use hard-coded routes? Do the relations have semantics? Does the representation state which transitions are available? If not, `_links` is stage dressing.

### “We skip HATEOAS because we practice pragmatic REST”

We can be pragmatic and build an excellent HTTP API. What we cannot do is redefine a mandatory constraint as optional and keep the original name for SEO purposes.

### “Swagger proves it is REST”

OpenAPI describes the operations and paths of an HTTP interface. It is useful, generates clients, and makes teams considerably happier. None of that proves application state is driven by hypermedia. In fact, a generated client is usually coupled to the exact catalog of documented routes.

### “More REST is always better”

REST optimizes certain properties under certain constraints. It is not a moral scale. If two internal services evolve together, require strongly typed contracts, and prioritize efficiency, gRPC may be a better fit. If the domain naturally resembles a graph of queries, GraphQL may be more appropriate. If we send commands, RPC can be honest and simple.

The worst API is not one that admits to being RPC. It is one that adopts REST ceremonies without gaining their benefits and forces everyone to pretend architecture happened.

## What is REST actually good for?

The style makes particular sense when we need:

- many clients developed by different organizations;
- independent evolution over many years;
- broad scale and effective use of caches and intermediaries;
- runtime discovery of resources and transitions;
- a general interface that hides implementation details;
- integration through shared vocabularies rather than mandatory SDKs.

In other words, problems resembling those of the Web.

For a private API serving a mobile application controlled by the same team, the cost of designing hypermedia types, relations, and adaptive clients may not be justified. We can respect HTTP and provide clear resources, good errors, idempotency, documentation, and caching without claiming to implement REST in full.

Calling it an **HTTP API**, **JSON API**, **resource-oriented API**, or simply an **API** does not diminish its quality. Quite the opposite: it lets us discuss its actual properties without borrowing prestige from a dissertation nobody in the meeting opened.

## A quick test before saying REST

We can ask ourselves:

1. Does every request carry the required context, or does it depend on a conversational session stored on the server?
2. Do responses correctly state their caching possibilities?
3. Are resources identified independently of their implementation?
4. Do representations and media types explain how messages should be processed?
5. Do we respect the semantics of methods, status codes, and headers?
6. Does the client discover URIs and transitions through representations?
7. Can the server change its route structure without recompiling consumers?
8. Can intermediaries understand what they need without private domain rules?

If the answer to number six is “no, but we have a document listing every endpoint,” we probably built a conventional HTTP API.

There is no need to call the architecture police. We only need to describe it honestly.

## The Web was the demo

The irony is that we use REST every day in its most successful form and then build “REST APIs” by removing exactly what made the Web evolvable.

A browser enters through a URI, understands standardized media types, follows links, presents forms, negotiates content, uses caches, crosses proxies, and chooses its next step from the representation it received.

A typical API arrives carrying a 180-page PDF, concatenates strings to construct URLs, knows a five-request sequence in advance, and breaks when `v1` becomes `v2`.

The former was designed for independent evolution.

The latter has JSON with good manners.

That may be enough. It often is. But if we are going to call it REST, we should at least invite REST to the meeting.

---

**Sources:**

- Roy T. Fielding: [*Architectural Styles and the Design of Network-based Software Architectures*](https://ics.uci.edu/~fielding/pubs/dissertation/top.htm), complete doctoral dissertation.
- Roy T. Fielding: [chapter 5, *Representational State Transfer (REST)*](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm).
- Roy T. Fielding: [*REST APIs must be hypertext-driven*](https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven).
- IETF: [RFC 9110, *HTTP Semantics*](https://www.rfc-editor.org/rfc/rfc9110.html).
- IETF: [RFC 8288, *Web Linking*](https://www.rfc-editor.org/rfc/rfc8288.html).
- IETF: [RFC 4627, the first specification of `application/json`](https://www.rfc-editor.org/rfc/rfc4627.html).
- IANA: [media types registry](https://www.iana.org/assignments/media-types/).
- FCC: [*Review of Regulatory Requirements for Incumbent LEC Broadband Telecommunications Services*](https://docs.fcc.gov/public/attachments/fcc-02-338a1.pdf).
- OECD: [*Broadband Growth and Policies in OECD Countries*](https://www.oecd.org/content/dam/oecd/en/publications/reports/2008/06/broadband-growth-and-policies-in-oecd-countries_g1gh9366/9789264046764-en.pdf).
