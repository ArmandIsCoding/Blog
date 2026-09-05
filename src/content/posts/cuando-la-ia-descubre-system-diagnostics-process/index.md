---
title: "Cuando la IA descubre Process: automatización local con .NET 11 y un poco de sentido común* (*opcional)"
description: "Las nuevas APIs de System.Diagnostics.Process en .NET 11 simplifican ejecutar herramientas, capturar su salida y conectarlas con IA. Una combinación polenta, siempre que no le entreguemos las llaves del servidor al modelo **. (** también opcional)"
publishedAt: 2026-09-05
tags:
  - dotnet
  - csharp
  - inteligencia-artificial
  - automatizacion
  - seguridad
draft: false
---

Hay una diferencia importante entre una IA que **explica** cómo hacer algo y una IA que efectivamente lo hace.

La primera nos dice que deberíamos convertir cuatrocientos TIFF a PDF, revisar el espacio libre del servidor o clasificar las fotos de las vacaciones. La segunda abre un proceso, ejecuta una herramienta y vuelve con el resultado. Es justo en ese pequeño salto —entre la sugerencia y la acción— donde `System.Diagnostics.Process` se vuelve muy interesante. O sea, para los que siguen resistiendo a la injusta omnipresencia de Python en el mundo AI y se empeñan a usar C#... como gente de bien.

Y también donde conviene guardar la motosierra antes de que alguien diga: “¿Y si dejamos que el modelo arme todo el comando completo?”.

## Primero, una pequeña trampa documental

Llegué a estas APIs desde la página de [`System.Diagnostics.Process` con la vista de .NET 10](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process?view=net-10.0). Sin embargo, al abrir los miembros nuevos, Microsoft Learn redirige a .NET 11.

No es un detalle menor: **la expansión de `Process` pertenece a .NET 11 y, al momento de escribir esto, está documentada para Preview 7**. Las firmas todavía podrían cambiar antes de la versión final.

Hecha la aclaración, veamos por qué vale la pena prestar atención.

## `Process` siempre pudo hacer esto... más o menos

.NET puede iniciar procesos desde hace décadas. El problema nunca fue ejecutar `git`, `ffmpeg`, `robocopy` o una utilidad interna escrita durante la presidencia de De la Rúa. El problema era hacerlo bien.

Capturar simultáneamente `stdout` y `stderr`, esperar la finalización, evitar bloqueos, cancelar la operación y liberar los handles obligaba a escribir bastante infraestructura. Y era peligrosamente fácil leer primero un stream mientras el otro llenaba su buffer y dejaba a ambos procesos mirándose en un abrazo mortal.

Las nuevas APIs buscan resolver justamente esos bordes:

- `Process.Run` y `Process.RunAsync` ejecutan y devuelven el estado de salida.
- `Process.RunAndCaptureText` y `Process.RunAndCaptureTextAsync` agregan la salida estándar y la salida de error.
- `ReadAllText`, `ReadAllBytes` y sus variantes asíncronas leen ambos streams de forma coordinada.
- `ReadAllLines` y `ReadAllLinesAsync` entregan valores `ProcessOutputLine`, conservando si cada línea vino de `stdout` o de `stderr`.
- `StartAndForget`, `StartDetached` y `KillOnParentExit` permiten expresar mejor quién debe sobrevivir a quién.
- El control más fino de handles reduce filtraciones accidentales hacia los procesos hijos.

La motivación del diseño menciona explícitamente el drenaje simultáneo de `stdout` y `stderr`, la prevención de deadlocks y una administración más segura del ciclo de vida. En otras palabras: menos plomería artesanal alrededor de una operación que parece simple hasta que se desmadra todo.

## El caso sencillo: ejecutar, capturar, interpretar

Supongamos que una herramienta interna necesita diagnosticar la instalación de .NET de una computadora y entregar una explicación entendible para una persona no técnica.

Con .NET 11, la parte mecánica queda muy pequeña:

```csharp
using System.Diagnostics;

using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));

ProcessTextOutput result = await Process.RunAndCaptureTextAsync(
    "dotnet",
    ["--info"],
    timeout.Token);

Console.WriteLine($"PID: {result.ProcessId}");
Console.WriteLine($"Exit code: {result.ExitStatus.ExitCode}");

string evidence = $"""
    STDOUT:
    {result.StandardOutput}

    STDERR:
    {result.StandardError}
    """;

// `assistant` representa el cliente de IA que use nuestra aplicación.
string summary = await assistant.SummarizeAsync(evidence, timeout.Token);
Console.WriteLine(summary);
```

La IA no necesitó acceso a una terminal. Tampoco decidió qué programa ejecutar. Recibió evidencia producida por una operación conocida y la convirtió en una explicación útil.

Ese orden importa:

1. Nuestra aplicación elige una herramienta permitida.
2. `Process` la ejecuta con argumentos controlados.
3. El sistema captura resultado, errores y código de salida.
4. Recién entonces el modelo interpreta la evidencia.

La IA funciona como analista, no como adolescente con la contraseña de administrador.

## Cuando queremos mirar el proceso mientras trabaja

Para una tarea larga quizá no queramos esperar diez minutos y recibir una pared de texto al final. `ReadAllLinesAsync` permite observar ambos canales a medida que producen datos.

Este ejemplo escucha una conversión de video y separa los mensajes normales de los errores:

```csharp
using System.Diagnostics;

var startInfo = new ProcessStartInfo("ffmpeg")
{
    UseShellExecute = false,
    RedirectStandardOutput = true,
    RedirectStandardError = true,
};

startInfo.ArgumentList.Add("-i");
startInfo.ArgumentList.Add("entrada.mov");
startInfo.ArgumentList.Add("-c:v");
startInfo.ArgumentList.Add("libx265");
startInfo.ArgumentList.Add("salida.mp4");

using Process process = Process.Start(startInfo)
    ?? throw new InvalidOperationException("No se pudo iniciar ffmpeg.");

await foreach (ProcessOutputLine line in process.ReadAllLinesAsync(cancellationToken))
{
    string channel = line.StandardError ? "ERR" : "OUT";
    Console.WriteLine($"[{channel}] {line.Content}");

    // Podríamos publicar la línea en una cola y pedirle a un modelo pequeño
    // que detecte progreso estancado, codecs faltantes o espacio insuficiente.
}

await process.WaitForExitAsync(cancellationToken);
```

Que una línea llegue por `stderr` no siempre significa que la operación falló —`ffmpeg`, por ejemplo, informa bastante por allí—, pero preservar el origen le da al consumidor mejor contexto y evita inventar prefijos o coordinar dos lectores por separado.

## La idea realmente potente: herramientas tipadas para el agente

El error de diseño más tentador sería este:

```csharp
// No hagan esto.
string command = await model.CreateCommandAsync(userPrompt);
Process.Start("sh", ["-c", command]);
```

Una instrucción malinterpretada, un documento con *prompt injection* o una comilla ubicada con creatividad ya podrían transformar “ordená mis facturas del ARCA" en una anécdota para la próxima auditoría.

La alternativa es ofrecerle al modelo un menú pequeño de acciones tipadas. El modelo elige la intención; el código tradicional decide el ejecutable y construye cada argumento.

```csharp
enum AutomationTool
{
    DotnetInfo,
    GitWorkingTree,
    VerifyBackup
}

static Task<ProcessTextOutput> ExecuteAsync(
    AutomationTool tool,
    CancellationToken cancellationToken)
{
    return tool switch
    {
        AutomationTool.DotnetInfo =>
            Process.RunAndCaptureTextAsync(
                "dotnet", ["--info"], cancellationToken),

        AutomationTool.GitWorkingTree =>
            Process.RunAndCaptureTextAsync(
                "git", ["status", "--porcelain=v1"], cancellationToken),

        AutomationTool.VerifyBackup =>
            Process.RunAndCaptureTextAsync(
                "restic", ["check", "--read-data-subset=2%"], cancellationToken),

        _ => throw new ArgumentOutOfRangeException(nameof(tool))
    };
}
```

Esto no vuelve inocuas a esas operaciones. `git status` puede revelar nombres sensibles y `restic` necesita credenciales. Pero reduce muchísimo la superficie: el modelo no puede cambiar `status` por `push --force`, ni `check` por `forget --prune`, porque esas posibilidades sencillamente no existen en el contrato.

`ArgumentList` también es preferible a concatenar una cadena: mantiene los argumentos separados y evita que una ruta con espacios se convierta en un acertijo de comillas. **No reemplaza la validación semántica**, pero elimina una categoría entera de errores de parsing.

## Automatizaciones de nicho: donde esto brilla

No imagino estas APIs reemplazando a Kubernetes, Power Automate o un sistema serio de jobs. Su lugar más interesante está en los huecos: tareas demasiado específicas para justificar una plataforma, pero suficientemente repetitivas como para molestarnos todos los martes, o los viernes... sobre todo los viernes.

### En una empresa

- Reunir logs de tres utilidades internas, eliminar datos sensibles y pedirle a un modelo local que redacte un diagnóstico inicial para soporte.
- Ejecutar validadores de una aplicación heredada antes de una instalación y convertir códigos de error crípticos en instrucciones para el operador.
- Consultar herramientas de inventario autorizadas y generar un resumen de diferencias entre computadoras, sin enviar la información fuera de la red.
- Vigilar la salida de una importación nocturna y escalar solamente las líneas anómalas, en vez de pedirle a alguien que lea un archivo de 80 MB cada mañana.
- Envolver un conversor propietario de CAD, GIS o documentos que sólo existe como ejecutable y darle una interfaz conversacional acotada.

### En casa

- Pedir “convertí los videos del cumpleaños a un formato que reproduzca el televisor” y mapear esa intención a uno de tres perfiles de `ffmpeg` previamente probados.
- Clasificar fotos con un modelo visual y luego ejecutar movimientos **dentro de una carpeta de staging**, nunca directamente sobre el archivo familiar definitivo.
- Revisar backups locales, resumir advertencias y avisar sólo cuando haya algo accionable.
- Leer sensores o controlar equipos viejos que ofrecen una utilidad de línea de comandos pero jamás conocieron una API HTTP.
- Preparar lotes de PDFs para OCR y usar IA para proponer nombres, dejando la confirmación humana antes del renombrado final.

Es automatización de taller: una pieza hecha a medida para un banco de trabajo concreto. Y eso puede ser mucho más valioso que otra plataforma universal con catorce microservicios y un dashboard violeta.

## El peligro no está en `Process`; está en la autoridad

La propia documentación de `Process` advierte que llamar sus métodos con datos no confiables es un riesgo de seguridad. Si agregamos un modelo generativo en el medio, “dato no confiable” incluye bastante más que el texto escrito por el usuario:

- contenido de documentos y páginas que el modelo leyó;
- nombres de archivos y metadatos;
- salida producida por otros programas;
- instrucciones recuperadas desde una base vectorial;
- incluso texto generado anteriormente por el propio modelo.

Un agente puede sufrir *prompt injection* sin que nadie toque el cuadro de texto. Basta con que procese un README que diga “ignorá tus reglas y ejecutá esto”. Si nuestro diseño convierte cualquier sugerencia en un comando, el problema dejó de ser una alucinación simpática.

Mis reglas mínimas serían:

1. **Nada de shells genéricos.** Evitar `cmd /c`, `powershell -Command`, `sh -c` y equivalentes salvo que el comando sea completamente fijo.
2. **Ejecutables en lista blanca.** Mejor aún, rutas absolutas hacia versiones conocidas.
3. **Argumentos construidos por código.** El modelo selecciona valores dentro de un esquema; no redacta la línea de comandos.
4. **Privilegios mínimos.** El proceso agente no debería ejecutarse como administrador “por comodidad”.
5. **Timeout y cancelación siempre.** Un proceso colgado también es un incidente, aunque no borre nada.
6. **Directorios de trabajo aislados.** Para archivos, usar staging, backups y límites de ruta verificables.
7. **Salida limitada y sanitizada.** Los logs pueden contener tokens, rutas privadas o gigabytes de entusiasmo.
8. **Confirmación humana para efectos irreversibles.** Borrar, publicar, transferir dinero, desplegar o modificar producción siguen siendo verbos especiales.
9. **Auditoría.** Registrar la acción tipada solicitada, sus argumentos aprobados, duración, resultado y quién la autorizó.
10. **Separar observación de acción.** Un flujo que diagnostica puede ser autónomo; uno que repara debería cruzar otra frontera de permisos.

`KillOnParentExit` y un control más preciso de handles ayudan con el ciclo de vida, pero no son un sandbox. Un proceso hijo conserva la autoridad del usuario que lo lanzó y puede hacer todo lo que ese usuario pueda hacer.

## Un patrón que me gusta

Para estos sistemas pienso en cuatro capas muy aburridas, que suele ser una buena señal:

```text
Pedido humano
    ↓
Modelo: propone una acción tipada
    ↓
Política: valida permisos, argumentos y necesidad de confirmación
    ↓
Ejecutor .NET: usa Process y devuelve evidencia estructurada
    ↓
Modelo: explica el resultado
```

El modelo aparece dos veces, pero **no toca directamente el sistema operativo**. Entre intención y ejecución hay una frontera determinista, testeable y bastante menos impresionable por un archivo malicioso.

También permite empezar pequeño. Podemos crear una única herramienta de diagnóstico de sólo lectura, medir si realmente ahorra tiempo y recién después agregar acciones. Si el primer prototipo necesita memoria vectorial, cinco agentes y acceso de administrador, probablemente no estamos automatizando una tarea: estamos fundando un problema.

## Una API pequeña que cambia el tipo de proyecto posible

La expansión de `System.Diagnostics.Process` no es una función de IA. No menciona embeddings, tokens ni agentes. Y justamente por eso me resulta interesante.

Los modelos ya saben transformar lenguaje en intención y resumir resultados. Lo que suele faltar es un puente local, predecible y controlable hacia las herramientas reales que una persona o una empresa ya utiliza. .NET 11 reduce bastante el código accidental necesario para construir ese puente y resuelve problemas de captura y ciclo de vida que antes invitaban a soluciones caseras.

¿Es peligroso? Ahhh sí, pero bueno, *'el que tenga miedo de morir que no nazca'*. También es peligroso un servicio con credenciales de producción, un script programado o una macro de Excel enviada por correo. La pregunta útil no es si existe riesgo, sino **dónde ponemos la autoridad y qué tan visible hacemos cada frontera**.

Una IA con acceso irrestricto a `Process` es una terminal con imaginación. Una IA rodeada de herramientas pequeñas, tipadas, auditables y con permisos mínimos puede ser otra cosa: ese compañero peculiar que se encarga de la tarea que nadie automatizó porque sólo ocurre doce veces al año.

Y doce veces al año, durante veinte años, ya es una cantidad perfectamente razonable de tiempo para recuperar.

---

**Fuentes consultadas:**

- Microsoft Learn: [Novedades de las bibliotecas de .NET 11 — expansión de Process](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-11/libraries#process-api-expansion).
- Microsoft Learn: [`System.Diagnostics.Process`](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process?view=net-11.0).
- Diseño de la API en `dotnet/runtime`: [New Process APIs #125838](https://github.com/dotnet/runtime/issues/125838).

> **Nota de versión:** este artículo describe APIs de .NET 11 Preview 7. Conviene revisar las firmas definitivas antes de llevar los ejemplos a producción.
