# Portafolio Personal · Luisana Gutiérrez Ruggia

Portafolio interactivo de proyectos de ciencia e ingeniería de datos. Arquitectura **JAMstack**: SPA estática en React + TypeScript desplegada en GitHub Pages, con **edge functions** en Cloudflare Workers para el backend del chat asistente (LLM via Groq) y una suite de **agentes batch** en GitHub Actions que mantienen el sitio sincronizado solo (CV, contexto del chat, índices de diagramas, documentación, updates por proyecto). Incluye animaciones 3D, grafos conceptuales **force-directed** estilo Obsidian, **hash routing** sin librerías, **i18n** completo ES/EN, CV bilingüe auto-generado, blog self-hosted en Markdown y música jazz de fondo.

🌐 **Live:** <https://luisanaruggia.github.io/portfolio/>
📦 **Repositorio:** <https://github.com/LuisanaRuggia/portfolio>

---

## Features

### Frontend
- **Hash routing custom** sin librerías para `#/project/<id>`, `#/cv` y `#/blog/<slug>`.
- **Carpetas 3D animadas** que se abren en abanico al pasar el cursor y revelan las cards de los proyectos.
- **Lightbox** con navegación circular entre proyectos de una misma categoría.
- **Vista de detalle por proyecto** con grafo conceptual, status badge, categorías cross-disciplina y seis secciones (Diagramas, Documentación, README+Stack, Enlaces, Blog/Video, Cambios recientes).
- **Grafo conceptual force-directed** estilo Obsidian con drag, levitación, filtro por grupo y leyenda dinámica.
- **Visor de diagramas fullscreen** con zoom, pan, pinch-zoom en mobile y navegación entre múltiples diagramas.
- **CV interactivo** (`#/cv`) que renderiza el `resume.json` como HTML con el estilo del sitio + botón para descargar el PDF.
- **Blog self-hosted bilingüe** (`#/blog`) con posts en Markdown + frontmatter, renderizados con `react-markdown` + `remark-gfm`.
- **Embed de YouTube responsive** 16:9 en la sección Blog y Video de cada proyecto (auto-detecta URLs de YouTube).
- **Multi-idioma ES/EN** completo en toda la UI, incluyendo aria-labels y descripciones de proyectos.
- **Tema claro/oscuro** con detección automática de preferencia del sistema.
- **Música jazz de fondo** opcional con Web Audio API + GainNode (compatibilidad iOS).
- **Proyectos cross-disciplina** que aparecen en múltiples carpetas con un indicador visual.

### Backend
- **Chat asistente flotante** con Cloudflare Worker + Groq (Llama 3.3 70B): rate-limited por IP via Workers KV, contexto del portafolio auto-generado e inyectado en el system prompt, voz en primera persona, scope estricto al portafolio. Canned responses para preguntas frecuentes (ahorran llamadas al LLM) y routing previo para distinguir "qué hay en tu portafolio" (lista) de "cuéntame del portafolio" (stack).
- **CV bilingüe auto-generado**: `resume.json` como source of truth, plantilla LaTeX (xelatex + Lato), salida en `CV_Luisana_Ruggia_es.pdf` y `_en.pdf`. Los proyectos del CV se filtran del `projects.ts` por status (solo `published`, `finished-open` y `finished` entran).
- **Status detection automático**: un release tag `v1.x+` en el repo dispara un workflow que abre PR cambiando el status del proyecto correspondiente.
- **Documentación PDF auto-regenerada** desde `README.md` + plantilla LaTeX cuando hay cambios, con variantes light/dark + bilingüe.

## Stack

| Capa | Tecnologías |
|---|---|
| Core frontend | React 18 + TypeScript 5.6 + Vite 5.4 |
| Estilos | Tailwind CSS 3.4 + `tailwindcss-animate` + `clsx` + `tailwind-merge` |
| Iconos | `lucide-react` |
| Markdown | `react-markdown` + `remark-gfm` (blog) |
| Animaciones | `lottie-react` (hero) + CSS 3D transforms (carpetas) + SVG force-directed simulación custom (grafo conceptual) |
| Browser APIs | Web Audio API · localStorage · sessionStorage · Pointer Events · Page Visibility · MediaQuery |
| Backend (chat) | Cloudflare Workers (edge functions) + Workers KV (rate limiting) + Groq Llama 3.3 70B |
| Agentes batch | Node 22 + tsx en GitHub Actions: generan updates, concepts, diagramas, documentación PDF, contexto del chat y CV |
| Compilación CV/docs | xelatex + pdftoppm (poppler) en CI |
| Build / CI / Deploy | pnpm 10 + tsc + Vite + GitHub Actions + GitHub Pages |

Bundle final: ~190 KB gzipped. Sin dependencias de routing, sin state management library, sin Framer Motion.

## Requisitos

- **pnpm** ≥ 8 (obligatorio, `npm` y `yarn` están bloqueados por el `preinstall` script)
- Node 20 o superior (recomendado: Node 22)
- Para regenerar el CV / documentación PDF en local: `xelatex` + `pdftoppm` (`sudo apt install texlive-xetex texlive-fonts-recommended texlive-latex-extra fonts-lato fonts-dejavu poppler-utils`)

## Comandos

### Frontend
```bash
cd frontend
pnpm install           # instalar dependencias
pnpm dev               # dev server con HMR
pnpm dev --port 5180   # forzar un puerto distinto al 5173
pnpm build             # build de producción → dist/
pnpm preview           # servir dist/ en local
```

### Backend (agentes batch + Worker)
```bash
cd backend
pnpm install
pnpm script:context    # regenera el contexto del chat desde projects.ts
pnpm script:updates    # regenera generated/updates.json (LLM resume git log)
pnpm script:concepts   # regenera generated/concepts.json (LLM extrae conceptos)
pnpm script:diagrams   # indexa SVGs de public/diagrams/ y los sanitiza
pnpm script:docs       # regenera el poster de documentación PDF + páginas PNG
pnpm script:cv         # regenera CV_Luisana_Ruggia_es.pdf + _en.pdf
pnpm script:status     # detecta status desde un release tag (GITHUB_REF=refs/tags/v1.0.0)
pnpm exec wrangler dev --config workers/chat/wrangler.toml   # worker local
```

## Estructura del repo

```
app/
├── frontend/                              # SPA Vite + React + TS
│   ├── src/
│   │   ├── App.tsx                        # root con LanguageProvider
│   │   ├── main.tsx
│   │   ├── features/
│   │   │   ├── home/folder-portfolio.tsx  # grilla 3D + header + routing
│   │   │   ├── projects/project-detail.tsx
│   │   │   ├── concepts/concept-graph.tsx
│   │   │   ├── chat/portfolio-chat.tsx
│   │   │   ├── cv/cv-page.tsx             # vista interactiva del CV (#/cv)
│   │   │   └── blog/                      # index + post + post-loader
│   │   ├── components/ui/
│   │   │   └── youtube-embed.tsx          # iframe responsive 16:9
│   │   ├── content/blog/                  # posts en Markdown + frontmatter
│   │   ├── data/
│   │   │   ├── projects.ts                # schema + catálogo
│   │   │   ├── resume.json                # copia auto-sincronizada del CV
│   │   │   └── generated/                 # updates, concepts, diagrams (LLM)
│   │   └── lib/
│   │       ├── i18n.tsx                   # LanguageProvider + traducciones
│   │       ├── sounds.ts                  # Web Audio API + GainNode
│   │       └── use-hash-route.ts          # hash routing custom (4 rutas)
│   ├── public/
│   │   ├── cv/CV_Luisana_Ruggia_{es,en}.pdf
│   │   ├── docs/<id>/{light,dark}/        # docs auto-generadas por proyecto
│   │   ├── diagrams/<id>/                 # SVGs sanitizados + captions.json
│   │   ├── images/                        # screenshots de proyectos
│   │   └── sounds/                        # jazz background + SFX
│   ├── vite.config.ts                     # base: /portfolio/
│   └── tailwind.config.js
├── backend/                               # agentes + Worker del chat
│   ├── workers/chat/
│   │   ├── src/
│   │   │   ├── index.ts                   # endpoint POST /chat
│   │   │   ├── canned-responses.ts        # FAQ que evita LLM cuando aplica
│   │   │   └── portfolio-context.generated.ts  # auto-gen
│   │   └── wrangler.toml
│   ├── scripts/
│   │   ├── lib/                           # groq, github, latex, resume, types
│   │   ├── sync-portfolio-context.ts      # genera el context del chat
│   │   ├── generate-updates.ts            # git log → JSON (LLM)
│   │   ├── generate-concepts.ts           # README → JSON (LLM)
│   │   ├── sync-diagrams.ts               # indexa SVGs (sin LLM)
│   │   ├── generate-docs.ts               # README + plantilla → PDF (LLM + xelatex)
│   │   ├── generate-cv.ts                 # resume.json + projects.ts → PDF bilingüe
│   │   └── detect-status.ts               # release tag → mutación de projects.ts
│   ├── data/
│   │   ├── resume.json                    # source of truth del CV (JSON Resume)
│   │   └── manifest.json                  # proyectos → repos GitHub
│   └── templates/
│       ├── documentation-poster.tex
│       └── cv.{es,en}.tex
└── .github/workflows/
    ├── deploy.yml                         # build + Pages
    ├── deploy-workers.yml                 # wrangler deploy del chat
    ├── regenerate-content.yml             # updates + concepts + diagrams
    ├── regenerate-cv.yml                  # CV bilingüe
    ├── regenerate-docs.yml                # docs PDF (4 variantes light/dark × es/en)
    ├── detect-status.yml                  # release → PR de status
    └── backend-checks.yml                 # typecheck del backend en PRs
```

## Cómo agregar un proyecto

1. Captura un screenshot del proyecto y colócalo en `frontend/public/images/<nombre>.png`.
2. Abre `frontend/src/data/projects.ts` y agrega una entrada al array `projects` de la categoría correspondiente.
3. Define `id`, `image`, `title`, `description`, `tags`, `status`, y opcionalmente `links`, `videoUrl`, `cvDescription`, `crossCategories`, `concepts`, `diagrams`, `documentation`, `readmeUrl`.
4. Si el proyecto pertenece a más de una categoría, usa `crossCategories: ["category.<otra>"]` para que aparezca también allí con el indicador cross-disciplina.
5. Si quieres una versión del texto distinta para el CV impreso (sin frases como "este mismo sitio"), define `cvDescription`.
6. `pnpm dev` para previsualizar, `git push origin main` para desplegar.

Los `status` válidos:
- `in-progress` → no aparece en CV.
- `published` → en producción y activo, sí aparece en CV.
- `finished-open` → cerrado pero open-source, sí aparece en CV.
- `finished` → cerrado y archivado, sí aparece en CV.

## Cómo agregar un post al blog

1. Crea `frontend/src/content/blog/<slug>.md` con frontmatter:
   ```yaml
   ---
   title: "Título del post"
   description: "Resumen corto, sale en la card del índice."
   date: "2026-07-15"
   tags: ["python", "spark", "dbt"]
   projectId: "ed1"   # opcional — vincula a un proyecto del portafolio
   ---

   Contenido del post en Markdown...
   ```
2. (Opcional) Crea `<slug>.en.md` con el mismo frontmatter en inglés. Si no existe, el sitio cae al ES con una nota.
3. Para vincular el post desde un proyecto, en `projects.ts` agrega `links: { blog: "/blog/<slug>" }`. El link interno navega dentro del SPA. Si en cambio quieres apuntar a un blog externo (Dev.to, Medium, etc.), usa la URL absoluta.

## Despliegue

`deploy.yml` corre automáticamente en cada `push` a `main` que toca el frontend. Instala dependencias con pnpm, compila con `pnpm build` (inyectando `VITE_CHAT_API_URL` como variable de entorno) y publica `dist/` a GitHub Pages.

Cuando hay cambios en `backend/workers/chat/**`, `deploy-workers.yml` regenera el contexto del chat y deploya el Worker con `wrangler`. Los workflows de regeneración (`regenerate-content`, `regenerate-cv`, `regenerate-docs`) corren cuando se tocan los inputs relevantes (README, resume.json, plantillas, projects.ts) y commitean los artefactos resultantes con `[skip ci]` para no disparar loops.

Todos los workflows que commitean usan un patrón "race-safe": `git pull --rebase` + retry hasta 5 veces, así si dos corren simultáneamente no chocan.

## Documentación técnica

La documentación detallada del proyecto Portafolio Personal vive en [`frontend/public/docs/dev1/`](frontend/public/docs/dev1/) (4 variantes: light/dark × es/en) y se sirve también desde la vista de detalle del proyecto en el sitio. Se regenera automáticamente con `pnpm script:docs` o vía el workflow `regenerate-docs.yml` cuando cambia el README o la plantilla LaTeX.

## Autora

Luisana Jacqueline Gutiérrez Ruggia
Estudiante de Ingeniería en Ciencia de Datos · Analista Junior de Datos en Paynet · Bogotá, Colombia.

[GitHub](https://github.com/LuisanaRuggia) · [LinkedIn](https://www.linkedin.com/in/luisana-j-gutiérrez-ruggia-128083256/) · [Portafolio](https://luisanaruggia.github.io/portfolio/) · [Blog](https://luisanaruggia.github.io/portfolio/#/blog)
