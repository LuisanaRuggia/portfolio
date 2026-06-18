# Portafolio Personal · Luisana Gutiérrez Ruggia

Portafolio interactivo de proyectos de ciencia e ingeniería de datos. Arquitectura **JAMstack**: SPA estática en React + TypeScript desplegada en GitHub Pages, con **edge functions** en Cloudflare Workers para el backend del chat asistente (LLM via Groq). Incluye animaciones 3D, grafos conceptuales **force-directed** estilo Obsidian, **hash routing** sin librerías, **i18n** completo ES/EN y música jazz de fondo.

🌐 **Live:** <https://luisanaruggia.github.io/portfolio/>
📦 **Repositorio:** <https://github.com/LuisanaRuggia/portfolio>

---

## Features

- **Hash routing custom** sin librerías para navegar entre la vista de home y el detalle de cada proyecto.
- **Carpetas 3D animadas** que se abren en abanico al pasar el cursor y revelan las cards de los proyectos.
- **Lightbox** con navegación circular entre proyectos de una misma categoría.
- **Vista de detalle por proyecto** con grafo conceptual, status badge, categorías cross-disciplina y seis secciones (Diagramas, Documentación, README+Stack, Enlaces, Blog/Video, Cambios recientes).
- **Grafo conceptual force-directed** estilo Obsidian con drag, levitación, filtro por grupo y leyenda dinámica.
- **Visor de diagramas fullscreen** con zoom, pan, pinch-zoom en mobile y navegación entre múltiples diagramas.
- **Chat asistente flotante** con backend real en Cloudflare Worker + Groq (Llama 3.1 8B): rate-limited, contexto del portafolio inyectado en el system prompt, responde en primera persona.
- **Multi-idioma ES/EN** completo en toda la UI, incluyendo aria-labels y descripciones de proyectos.
- **Tema claro/oscuro** con detección automática de preferencia del sistema.
- **Música jazz de fondo** opcional con Web Audio API + GainNode (compatibilidad iOS).
- **Proyectos cross-disciplina** que aparecen en múltiples carpetas con un indicador visual.

## Stack

| Capa | Tecnologías |
|---|---|
| Core | React 18 + TypeScript 5.6 + Vite 5.4 |
| Estilos | Tailwind CSS 3.4 + `tailwindcss-animate` + `clsx` + `tailwind-merge` |
| Iconos | `lucide-react` |
| Animaciones | `lottie-react` (hero) + CSS 3D transforms (carpetas) + SVG force-directed simulación custom (grafo conceptual) |
| Browser APIs | Web Audio API · localStorage · Pointer Events · Page Visibility · MediaQuery |
| Backend (chat) | Cloudflare Workers (edge functions) + KV (rate limiting) + Groq Llama 3.1 8B |
| Agentes batch | Node + tsx en GitHub Actions: generan updates, concepts y contexto del chat desde el repo |
| Build / CI / Deploy | pnpm 10 + tsc + Vite + GitHub Actions + GitHub Pages |

Bundle final: ~180 KB gzipped. Sin dependencias de routing, sin state management library, sin Framer Motion.

## Requisitos

- **pnpm** ≥ 8 (obligatorio, `npm` y `yarn` están bloqueados por el `preinstall` script)
- Node 18 o superior (recomendado: Node 20)

## Comandos

```bash
pnpm install           # instalar dependencias
pnpm dev               # dev server con HMR
pnpm dev --port 5180   # forzar un puerto distinto al 5173
pnpm build             # build de producción → dist/
pnpm preview           # servir dist/ en local
```

## Estructura del repo

```
app/
├── src/
│   ├── App.tsx                         # root con LanguageProvider
│   ├── main.tsx                        # entry de React
│   ├── components/ui/
│   │   ├── 3d-folder.tsx               # FolderPortfolio · AnimatedFolder · ProjectCard · ImageLightbox
│   │   ├── project-detail.tsx          # vista detalle + SectionCard + Modales + DiagramsViewer
│   │   ├── concept-graph.tsx           # grafo force-directed con drag y filtros
│   │   └── portfolio-chat.tsx          # chat flotante (mock hoy, LLM mañana)
│   ├── data/
│   │   └── projects.ts                 # schema + catálogo de proyectos
│   └── lib/
│       ├── i18n.tsx                    # LanguageProvider + traducciones ES/EN
│       ├── sounds.ts                   # Web Audio API + GainNode + SFX cache
│       └── use-hash-route.ts           # hash routing custom
├── public/
│   ├── sounds/                         # jazz background + SFX
│   ├── images/portfolio.png            # screenshot del proyecto Portafolio
│   ├── diagrams/portfolio/*.png        # diagramas de arquitectura
│   ├── docs/                           # documentación PDF por proyecto
│   ├── cv.pdf                          # CV descargable
│   ├── favicon.*                       # favicons (SVG + PNG + ICO)
│   └── girl-laptop.json                # animación Lottie del hero
├── index.html
├── package.json
├── vite.config.ts                      # base: /portfolio/
└── tailwind.config.js
```

## Cómo agregar un proyecto

1. Captura un screenshot del proyecto y colócalo en `public/images/<nombre>.png`.
2. Abre `src/data/projects.ts` y agrega una nueva entrada al array `projects` de la categoría correspondiente.
3. Define `id`, `image`, `title`, `description`, `tags`, `status` y opcionalmente `links`, `diagrams`, `documentationUrl`, `concepts` y `crossCategories`.
4. Si el proyecto pertenece a más de una categoría, usa `crossCategories: ["category.<otra>"]` para que aparezca también allí con el indicador de cross-disciplina.
5. Corre `pnpm dev` para previsualizar.
6. `git push origin main` para desplegar.

El docstring completo del schema vive al principio de `src/data/projects.ts`.

## Despliegue

`deploy.yml` corre automáticamente en cada `push` a `main`. Instala dependencias con pnpm, compila con `pnpm build` y publica `dist/` a GitHub Pages. La URL final es `https://luisanaruggia.github.io/portfolio/`.

## Documentación técnica

La documentación detallada del proyecto Portafolio Personal, incluyendo decisiones arquitectónicas, está en [`public/docs/dev1/documentation.pdf`](public/docs/dev1/documentation.pdf) y se sirve también desde la vista de detalle del proyecto en el sitio.

## Autora

Luisana Jacqueline Gutiérrez Ruggia
Estudiante de ingeniería en ciencia de datos con skills en análisis de datos, ciencia de datos e ingeniería de datos.

[GitHub](https://github.com/LuisanaRuggia) · [Portafolio](https://luisanaruggia.github.io/portfolio/)
