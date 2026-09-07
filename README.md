# helloworld.com.ar

Blog personal de Armando Andrés Meabe. Es un sitio estático construido con Astro, escrito principalmente en Markdown y publicado con GitHub Pages.

## Desarrollo local

Requiere Node.js 24 y pnpm 11.

```bash
pnpm install
pnpm dev
```

Para ejecutar las mismas validaciones que CI:

```bash
pnpm build
```

## Crear un artículo

Cada artículo vive en su propia carpeta dentro de `src/content/posts/`. El nombre de la carpeta se convierte en el slug de los artículos nuevos.

```text
src/content/posts/mi-articulo/
├── index.md
├── diagrama.png
└── captura.webp
```

Frontmatter mínimo:

```yaml
---
title: "Título del artículo"
description: "Una descripción concreta para listados, RSS y buscadores."
publishedAt: 2026-09-05
tags:
  - arquitectura
  - dotnet
lang: es
draft: true
---
```

Las imágenes se referencian desde Markdown con una ruta relativa:

```markdown
![Descripción útil de la imagen](./diagrama.png)
```

Astro valida la metadata y optimiza las imágenes al compilar.

## Drafts

Los artículos con `draft: true` aparecen en desarrollo local con una marca visible, pero se excluyen del build de producción, RSS, sitemap y páginas de temas.

Un draft versionado en un repositorio público sigue siendo públicamente legible en GitHub. `draft` controla la publicación en el sitio, no la confidencialidad.

## URLs de artículos

Todos los artículos se publican como `/posts/<slug>/`, usando el nombre de su carpeta como slug.

### Traducciones

El español es el idioma principal y conserva las URLs `/posts/<slug>/`. Las ediciones en inglés usan
`/en/posts/<slug>/`. Cada idioma vive en su propio Markdown, con un slug natural, y ambos se relacionan
mediante la misma `translationKey`:

```yaml
lang: es
translationKey: rest-actually-explained
```

```yaml
lang: en
translationKey: rest-actually-explained
```

El layout genera el enlace entre versiones, `hreflang`, canonical, idioma de OpenGraph y metadata
estructurada. El listado y RSS en inglés están disponibles en `/en/` y `/en/feed.xml`.

## Proyectos

`src/content/projects/` contiene una selección editorial de proyectos. No se importan automáticamente todos los repositorios públicos de GitHub.

## Publicación

El workflow `.github/workflows/deploy.yml` valida y construye cada pull request. Los pushes a `main` también despliegan el resultado en GitHub Pages.

En la configuración del repositorio, la fuente de GitHub Pages debe estar establecida en **GitHub Actions**. El dominio personalizado se conserva mediante `public/CNAME`.
