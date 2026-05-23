# Portafolio — Luisana Gutiérrez Ruggia

Portafolio interactivo de proyectos. Carpetas 3D animadas, multi-idioma (ES/EN), tema claro/oscuro y música de fondo opcional.

🚀 **Live:** <https://luisanaruggia.github.io/portfolio/>

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + `tailwindcss-animate`
- `lottie-react` para animación del hero
- Web Audio API + HTMLAudioElement para sonidos (whoosh, pop, jazz de fondo)
- i18n custom (sin dependencias) con `LocalizedString` para campos bilingües

## Requisitos

- **pnpm** ≥ 8 (obligatorio — npm y yarn están bloqueados por `preinstall`)
- Node 20+ recomendado (el proyecto compila con 18 pero el ecosistema lo pide)

## Comandos

```bash
pnpm install   # instalar dependencias
pnpm dev       # dev server con HMR
pnpm build     # build de producción → dist/
pnpm preview   # servir dist/ en local
```

## Estructura

```
app/
├── src/
│   ├── components/ui/3d-folder.tsx  # componente principal
│   ├── data/projects.ts             # catálogo de proyectos
│   ├── lib/i18n.tsx                 # sistema multi-idioma
│   ├── lib/sounds.ts                # SFX (whoosh, pop)
│   └── assets/lottie/               # animaciones
└── public/
    ├── sounds/                      # MP3 (jazz, SFX)
    └── images/projects/             # screenshots de proyectos
```

## Cómo agregar un proyecto

1. Capturar screenshot → `public/images/projects/<id>.webp`
2. Editar `src/data/projects.ts`: cambiar `image` y agregar `links`
3. `pnpm dev` para previsualizar
4. `git push origin main` → deploy automático

Ver el docstring en `src/data/projects.ts` para el schema completo.
