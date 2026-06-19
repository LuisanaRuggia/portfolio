---
title: "Cómo construí mi portafolio interactivo con un chat de IA"
description: "El stack, las decisiones y la lógica detrás de un portafolio que se mantiene solo, con un chat asistente que responde como yo."
date: "2026-06-20"
tags: ["react", "typescript", "ia", "cloudflare", "storytelling"]
projectId: "dev1"
---

Cuando tuve el reto de iniciar mi portafolio, pensé que había mejores formas de mostrar lo que hago que el camino tradicional. Un PDF y un LinkedIn son útiles, pero te muestran resultados, no cómo piensas. Y yo quería que alguien que entrara a mi sitio sintiera, en menos de un minuto, cómo trabajo en realidad.

Decidí algo simple en concepto y complicado en práctica: construir un portafolio que fuera, por sí mismo, una demostración de mis habilidades. Que no solo dijera "sé Python"; que lo usara. Que no solo dijera "trabajo con IA"; que tuviera un chat real con IA respondiendo en mi nombre.

Te cuento cómo armé todo, paso por paso, intentando que tenga sentido aunque no sepas mucho de programación.

## La columna vertebral: el stack

Cuando alguien dice "stack" en programación, se refiere al conjunto de tecnologías que sostienen un proyecto. Como cuando armas una receta: cada ingrediente cumple una función. El mío quedó así:

- **React + TypeScript**: el motor del sitio. React me deja crear interfaces interactivas (los proyectos que se abren, las animaciones, el modo oscuro). TypeScript es como ponerle reglas al lenguaje JavaScript para que avise antes de que cometa un error.
- **Vite**: el "armador" del proyecto. Toma todos mis archivos de código y los empaqueta en algo que el navegador entiende.
- **Tailwind CSS**: una forma de escribir estilos sin tener que abrir archivos aparte. En vez de decir "esta clase tiene fondo azul y borde redondeado" en un archivo CSS, lo escribo directo en el HTML.
- **GitHub Pages**: donde vive el sitio. Es gratis para repositorios públicos y bastante rápido.
- **Cloudflare Workers**: un pequeño servidor que corre en cientos de ciudades alrededor del mundo, incluyendo Bogotá. Lo uso solo para el chat, porque GitHub Pages no puede ejecutar código del lado del servidor.
- **Groq**: el proveedor del modelo de IA. Es como tener acceso a un cerebro de chatbot, pero rápido y barato.

Suena a mucho, pero cada pieza resuelve un problema concreto.

## Lo que pasa cuando entras al sitio

Imagina que mi portafolio es una casa. Cuando alguien toca el timbre (entra al sitio), GitHub Pages le entrega de inmediato todos los archivos estáticos: el HTML, el CSS, las imágenes, el código en JavaScript. Todo eso se descarga al navegador del visitante y se arma ahí mismo. Eso lo hace muy rápido.

Lo importante es esto: **no hay nadie del otro lado**. No hay un servidor mío esperando que entres. Solo archivos que ya están en una nube y se entregan.

Hasta acá todo bien. Pero ¿qué pasa cuando el visitante abre el chat y escribe una pregunta?

## El chat: por qué necesitaba un servidor pequeño

El chat no puede ser estático. Tiene que hablar con un modelo de IA, y para eso necesita una clave secreta (como una contraseña que demuestra que tengo acceso al servicio). Esa clave **no puede estar en el código del sitio**, porque cualquiera podría inspeccionarlo y robarla.

Así que armé un intermediario: un "worker" en Cloudflare. Cuando el visitante escribe un mensaje, el flujo es así:

1. El navegador manda el mensaje al worker.
2. El worker tiene la clave secreta guardada (donde nadie puede verla) y la usa para llamar al modelo de IA.
3. El modelo responde.
4. El worker reenvía la respuesta al navegador.

Es como un mesero en un restaurante. Tú pides en la mesa y el mesero se encarga de hablar con la cocina. Nunca entras a la cocina y nunca ves la receta secreta.

## La parte difícil: que el chat suene como yo

Acá fue donde pasé más tiempo. Hacer que un modelo de IA conteste preguntas no es difícil. Lo difícil es que conteste **como tú**, no como un asistente externo que habla de ti en tercera persona.

La diferencia es enorme. Si alguien pregunta "¿qué proyectos tienes?", la respuesta debería sonar a algo como "construí un lakehouse local con Spark y dbt...", no "Luisana ha trabajado en varios proyectos de datos". Suena obvio, pero los modelos, por defecto, tienden a la segunda opción.

La solución fue darle al modelo un manual de personalidad antes de cada respuesta. Le explico cómo tiene que sonar, qué expresiones evitar, qué hacer si le preguntan algo fuera de mi portafolio. Es parecido a entrenar a alguien que va a contestar el teléfono en mi nombre: no le doy un guion fijo, le doy un tono y unas reglas claras.

Además, en cada interacción le inyecto un resumen actualizado de todos mis proyectos. Cuando alguien pregunta por uno específico, el modelo responde con detalles reales en vez de inventar. Y si le preguntan algo que no tiene contexto (el clima, política, opiniones), el manual le dice que decline amablemente y redirija al tema del portafolio.

Para protegerme de bots, el worker cuenta cuántos mensajes mandó cada visitante en el último minuto. Si pasa de diez, le pide que espere. Es un sistema simple pero efectivo, y lo guarda en una base de datos chiquita que Cloudflare ofrece gratis.

## El CV que se mantiene solo

Detesto actualizar CVs. Cada vez que aprendía algo o terminaba un proyecto, tenía que editar mi PDF, buscar el archivo de Word, dejarlo lindo de nuevo. Era un trabajo que evitaba.

Entonces convertí mi CV en datos. Tengo un archivo `.json` (un formato de texto estructurado) con toda mi información: nombre, educación, trabajo, habilidades, idiomas. Lo escribo una sola vez en español y en inglés.

Después, dos cosas leen ese archivo:

1. **Un script con LaTeX** (un lenguaje pensado para componer documentos elegantes). Toma los datos y genera dos PDFs: uno en español y otro en inglés. Cuando hago cualquier cambio en el JSON, el script se ejecuta solo y los PDFs quedan actualizados.

2. **Una página dentro del sitio** (`/cv`). Lee el mismo JSON y lo muestra como HTML bonito. Si quieres el PDF, hay un botón para descargarlo.

Los proyectos del CV se filtran automáticamente. Solo entran los que están terminados o publicados. Los que sigo desarrollando no aparecen. Cuando un proyecto cambia de estado, el CV se regenera solo, sin que toque nada.

El resultado es que ahora actualizo mi CV sin pensarlo. Cambio una palabra, hago un commit, y en dos minutos el sitio y el PDF están actualizados.

## Decisiones que me hicieron dudar

Hubo dos decisiones que me costaron bastante.

La primera fue **dónde poner el blog**. Podía publicar en Dev.to, una plataforma para gente que programa, y tendría audiencia inmediata. Pero acabaría dependiendo de una URL ajena, y si Dev.to cambia algo, me afecta. Al final decidí construir el blog dentro de mi portafolio: cada post es un archivo de texto en mi repositorio, escrito en un formato simple llamado Markdown. Cuando hago un cambio, el sitio entero se reconstruye con el post nuevo. Más adelante, cuando tenga varios posts, puedo cross-postear a Dev.to apuntando a mi sitio como fuente original.

La segunda fue **qué modelo de IA usar**. Hay opciones más conocidas (OpenAI, Anthropic), pero son más caras. Groq corre modelos abiertos (Llama, hecho por Meta) a velocidades muy rápidas y por centavos de dólar al mes. Para un chat de portafolio, donde la velocidad importa más que tener el modelo más sofisticado del mundo, la elección fue fácil.

## Lo que me llevo de todo esto

Tres cosas me sorprendieron al construir este sitio.

La primera: **trabajar con IA en producción no es magia**. La mayor parte del tiempo que pasé con el chat no fue programando, fue afinando el manual de personalidad. Probaba una versión, leía las respuestas, ajustaba el tono, volvía a probar. Es un proceso más cercano a editar un texto que a escribir código.

La segunda: **automatizar pequeñas tareas tiene efectos grandes**. Cuando hice que el CV se regenerara solo, dejé de procrastinar para actualizarlo. La fricción desapareció y empecé a tocarlo seguido. Lo mismo pasó con la documentación de los proyectos.

La tercera: **un portafolio es un proyecto en sí mismo**. Lo había pensado como un sitio para mostrar lo que hacía. Pero en el proceso terminé construyendo varias herramientas que ahora son ejemplos vivos de cómo trabajo. El portafolio se convirtió en uno de mis mejores proyectos.

## El código

Está abierto en [github.com/LuisanaRuggia/portfolio](https://github.com/LuisanaRuggia/portfolio). Si quieres copiarlo como base para algo tuyo, las partes interesantes están en `backend/scripts` (los pequeños programas que mantienen el portafolio actualizado) y `backend/workers/chat` (el código del chat). Si encuentras algo que se puede hacer mejor, escríbeme: me encanta aprender de gente que mira las cosas desde otro ángulo.
