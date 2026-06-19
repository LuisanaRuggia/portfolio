---
title: "Cómo construí mi portafolio interactivo con un chat LLM"
description: "Stack, decisiones técnicas y particularidades de un portafolio JAMstack con chat asistente, CV bilingüe auto-generado y agentes en GitHub Actions."
date: "2026-06-20"
tags: ["react", "typescript", "llm", "cloudflare", "ai"]
projectId: "dev1"
---

## Por qué quise hacer algo distinto

La mayoría de los portafolios son un PDF y un LinkedIn. Funcionan, pero no muestran cómo piensas, solo lo que ya hiciste. Yo quería algo que demostrara mi forma de trabajar: end-to-end, técnica pero con personalidad, y construido con las mismas herramientas que digo que sé usar.

Así que en vez de listar mis skills en un grid estático, decidí construir un sitio que **fuera** mis skills. Música jazz de fondo opcional, animaciones suaves, un chat que conoce mis proyectos y los explica como si fuera yo, un CV bilingüe que se regenera solo cuando algo cambia, y un blog (este) que se compila en tiempo de build.

## El stack en una línea

React 18 + TypeScript + Vite para el frontend, Tailwind para los estilos, GitHub Pages para hosting, Cloudflare Workers para el chat backend, y Groq como proveedor de LLM. Todo orquestado con GitHub Actions y costo total mensual menor a tres dólares.

## La parte interesante: chat con voz propia

Lo más fácil de un chat con LLM es engancharlo. Lo difícil es que **suene** como vos y no como un asistente externo hablando de vos. La diferencia es enorme: un visitante que pregunta "¿qué proyectos tienes?" no debería escuchar "Luisana ha trabajado en...", debería escuchar "construí un lakehouse local con Spark + dbt...".

Lo resolví con un system prompt fuerte y un contexto del portafolio inyectado en cada request. La primera regla es la más importante:

```
ERES Luisana Ruggia respondiendo en TU PROPIO portafolio.
NO eres un asistente que habla sobre Luisana, ERES Luisana.
Habla SIEMPRE en primera persona singular.
NUNCA digas "te invito a explorar mi portafolio" — eso suena a asistente externo.
Di "construí", "trabajo en", "uso".
```

Más reglas de scope ("solo respondes sobre los proyectos y mi perfil"), de longitud ("máximo dos o tres oraciones") y de veracidad ("prohibido inventar combinaciones de tecnologías que no están en el contexto"). El system prompt completo está en el [worker del chat](https://github.com/LuisanaRuggia/portfolio/blob/main/backend/workers/chat/src/index.ts).

El **contexto del portafolio** se autogenera con un script (`sync-portfolio-context.ts`) que lee `projects.ts` del frontend y produce un resumen estructurado por categoría. Cuando agrego un proyecto nuevo, el chat lo conoce en el próximo deploy sin que toque el system prompt.

Para evitar abuso usé Cloudflare Workers KV como rate limiter: diez requests por minuto por IP. Más que suficiente para un visitante real, frena bots agresivos.

## Mi CV se mantiene solo

Detesto actualizar CVs. Es tedioso y siempre se desactualiza. Así que armé un flujo donde la fuente de verdad es un JSON Resume bilingüe (`resume.json`), una plantilla LaTeX con la tipografía Lato, y un script que renderiza el PDF en español e inglés.

El CV en pantalla (`#/cv`) lee el mismo JSON y lo muestra como HTML con el estilo del sitio. Desde ahí, el visitante descarga el PDF si quiere algo para imprimir o adjuntar a un mail.

El truco es que los proyectos que aparecen en el CV no se escriben dos veces: se filtran del propio `projects.ts` por estado. Si un proyecto tiene `status: "published"` o `"finished"`, entra al CV automáticamente; si está `"in-progress"`, no. Cuando un proyecto pasa a estar terminado, basta cambiar una palabra y el CV se regenera en CI.

## Decisiones que me costaron

**Routing custom vs react-router**. React Router es la opción obvia, pero agrega ~30KB y necesita configuración de SPA fallback en el servidor. Como GitHub Pages no soporta SPA fallback bien, escribí un mini router basado en `window.location.hash` (cincuenta líneas). Conoce cuatro rutas: home, `#/project/<id>`, `#/cv` y `#/blog`. Suficiente.

**Cloudflare Workers vs Vercel/Lambda**. Workers tiene mejor edge (latencia menor desde Bogotá), free tier más generoso (100k requests/día) y deploy más simple (`wrangler deploy`). El único trade-off es que el runtime es V8 isolates, no Node, así que algunas librerías no funcionan. Para un chat que llama a una API externa eso no importa.

**Groq vs OpenAI vs Anthropic vs modelo local**. Groq sirve Llama 3.1 8B a velocidades absurdamente rápidas (cientos de tokens por segundo) y cuesta centavos. Para un chat de portafolio donde la latencia importa más que la sofisticación, gana por mucho. Para tareas que necesitan más calidad, como redactar este post o sugerir cambios al CV, uso Llama 3.3 70B del mismo proveedor.

**Blog en Dev.to vs self-hosted**. Lo pensé bastante. Dev.to te da audiencia inmediata y zero esfuerzo. Pero acabás dependiendo de la URL de un tercero, perdés coherencia visual, y si Dev.to cambia algo, te jode. Decidí self-hostearlo: cada post es un `.md` con frontmatter, los carga `import.meta.glob` de Vite, y los renderiza `react-markdown`. Cuando tenga tres o cuatro posts buenos, los cross-posteo a Dev.to con `canonical_url` apuntando acá.

## Lo que me llevo

Tres aprendizajes después de armar todo esto:

1. **Un LLM en producción no es plug-and-play**. El system prompt es el setenta por ciento del trabajo. Pasé más tiempo refinando reglas de voz y de scope que codeando el worker.
2. **Workers KV es excelente para rate limit, no para state complejo.** Tiene latencia variable entre regiones. Si necesitás strong consistency, andá a otra cosa.
3. **Si tu CV se actualiza solo, vas a actualizarlo más seguido.** Convertirlo en código removió la fricción y ahora lo edito sin pensar.

## Repo

El código está abierto en [github.com/LuisanaRuggia/portfolio](https://github.com/LuisanaRuggia/portfolio). Si lo querés copiar como base, las partes interesantes están en `backend/scripts/` (los agentes que mantienen el portafolio) y en `backend/workers/chat/` (el worker del chat). Si encontrás algo que se puede hacer mejor, escribime: soy todo oídos.
