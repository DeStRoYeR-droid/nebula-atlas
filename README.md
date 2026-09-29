# Nebula Atlas

An interactive atlas of the universe's most beautiful nebulae. The home page is a
4×4 sliding puzzle that rearranges itself every 1.5 seconds; the gallery is a
searchable, filterable list; every nebula has its own URL and opens in a
full-screen detail view with previous/next navigation.

The site is fully static and is deployed to **GitHub Pages**. A small local
**FastAPI** admin edits the data file and turns full-resolution NASA/ESA images
into web-sized versions.

![Architecture image](/nebula-atlas-architecture.png)

---

## Contents

- [Tech stack](#tech-stack)
- [Features](#features)
- [Project structure](#project-structure)
- [Run it locally](#run-it-locally)
- [Add a nebula](#add-a-nebula)
- [Add or change images](#add-or-change-images)
- [Build](#build)
- [Test](#test)
- [Deploy to GitHub Pages](#deploy-to-github-pages)
- [Configuration](#configuration)
- [Quality notes](#quality-notes)
- [Credits](#credits)

---

## Tech stack

| Part | Technology |
| --- | --- |
| Website | [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Motion](https://motion.dev/) (Framer Motion) for animation, [Font Awesome](https://fontawesome.com/icons) icons, glassmorphism in the style of [css.glass](https://css.glass/) |
| Build & tests | Vite, Vitest, Testing Library |
| Admin & image pipeline | [Python 3.12](https://www.python.org/), [FastAPI](https://fastapi.tiangolo.com/), Pillow (AVIF/WebP), Tailwind CSS for the admin UI |
| Containers | Docker, Docker Compose |
| Hosting | GitHub Pages (via GitHub Actions) |

There is deliberately no router, state or UI library: the website has five routes,
so a ~100-line History API router is enough. Font Awesome icons are rendered
straight from their SVG definitions, so only the ~20 icons used are shipped.

## Features

**Views**
- **Home – sliding puzzle (View 1).** 15 tiles and one gap on a 4×4 board. Every
  1.5 s a tile slides into the gap; when there are more nebulae than fit, a tile on
  the edge slides off the board and the next nebula slides in. It pauses on
  hover/focus, when off-screen, in background tabs and while a nebula is open, has
  a Pause/Play button, and is off by default when the visitor prefers reduced motion.
- **Gallery – descriptive list (View 2).** Search (debounced, by name, catalogue
  number, nickname or constellation), filter by type, results rendered in pages of
  24 so a large atlas never mounts hundreds of cards at once.
- **Nebula detail.** Every nebula has a URL (`/nebula/eagle`). It opens as a
  modal over the page you came from (or the gallery, for direct visits), with
  breadcrumbs, previous/next buttons, ← → keys, swipe gestures on phones, a
  swipe-up details sheet on mobile, and credits linking to the source image.
- **Discover** explains each nebula type and links to the filtered gallery.
- **Contact & credits** lists the image credit for every nebula.
- Custom **404** page (also used for unknown nebula ids, with "did you mean…"
  suggestions), shooting-star background, light and dark themes.

**States:** initial loading screen (before JavaScript), skeletons while data
loads, blurred image placeholders, broken-image fallback, empty atlas, no search
results, data-loading error with retry, and error boundaries for the whole app,
each page and the dialog.

**SEO & sharing:** a static HTML file per page and per nebula with its own
`<title>`, description, canonical URL, Open Graph and Twitter card tags (each
nebula has its own 1200×630 share image), `sitemap.xml`, `robots.txt`,
`manifest.webmanifest`, favicon and app icons, `<noscript>` content.

**Accessibility:** semantic landmarks and heading order, skip link, keyboard
access everywhere, focus moved to the new page's heading after navigation, a
focus-trapped dialog (the page behind is `inert`) that returns focus when closed,
visible focus rings, alt text for every image, ARIA labels on icon-only buttons,
live announcements for search results and previous/next, WCAG AA contrast in both
themes, `prefers-reduced-motion` support.

**Performance:** only the home page is in the initial bundle (other pages, the
dialog and Motion's animation engine load on demand); responsive AVIF/WebP images
with `srcset`/`sizes`, lazy loading except above-the-fold tiles, intrinsic
width/height on every image (no layout shift), the data file and each page's code
are preloaded from the HTML, neighbouring nebula images are prefetched in the
dialog, and gallery rows use `content-visibility`.

**Security:** a Content-Security-Policy on every page (no inline scripts except
one hashed theme snippet), `rel="noopener noreferrer"` on external links, no
`dangerouslySetInnerHTML`. The admin binds to `127.0.0.1` only, validates every
field (ids are URL-safe slugs, image paths can't escape the site folder),
limits upload size, verifies uploads are real images and sends strict security
headers.

## Project structure

```
nebula-atlas/
├── .github/workflows/deploy.yml   CI: tests + build on every push/PR, deploy main to Pages
├── docker-compose.yml             web (Vite), api (admin), preview (production build)
├── .env.example                   configuration (copy to .env)
├── media/originals/               full-resolution source images (git-ignored)
│
├── backend/                       FastAPI admin + image pipeline
│   ├── app/
│   │   ├── main.py                HTTP API and static admin UI
│   │   ├── models.py              the nebula schema (single source of truth)
│   │   ├── store.py               read/write nebulae.json atomically
│   │   ├── images.py              AVIF/WebP sizes, share images, placeholders
│   │   ├── sources.py             download originals from source_url
│   │   ├── service.py             operations shared by the API and the CLI
│   │   ├── cli.py                 `python -m app.cli …`
│   │   ├── config.py              settings from environment variables
│   │   └── admin/                 admin UI (HTML + vanilla JS + built Tailwind CSS)
│   ├── admin-src/admin.css        Tailwind source for the admin UI
│   ├── tests/                     pytest
│   └── Dockerfile
│
└── frontend/                      the website
    ├── index.html                 app shell (head is filled in per page at build time)
    ├── vite.config.js
    ├── build/static-pages.js      writes per-page HTML, 404.html, sitemap, robots, manifest
    ├── scripts/serve_pages.py     serves a build exactly like GitHub Pages (preview)
    ├── public/
    │   ├── data/nebulae.json      ← the data
    │   ├── images/nebulae/<id>/   ← generated image sizes (committed)
    │   ├── og-image.jpg, favicon.*, icons/
    └── src/
        ├── App.jsx                layout, routes, dialog, error boundaries
        ├── config.js              site URL, base path, tuning constants
        ├── router/                tiny History API router
        ├── data/DataProvider.jsx  fetches nebulae.json once
        ├── lib/                   pure logic: parsing, search, puzzle, images, types
        ├── seo/                   page metadata (shared with the build step)
        ├── components/            PuzzleGrid, NebulaModal, NebulaImage, layout/, gallery/, states/
        ├── pages/                 Home, Gallery, Discover, Contact, NotFound
        ├── hooks/                 debounce, focus trap, reduced motion, visibility…
        └── styles/index.css       Tailwind theme, design tokens, glass, sky
```

## Run it locally

### With Docker (recommended)

```bash
cp .env.example .env              # on Linux, set LOCAL_UID/LOCAL_GID to `id -u` / `id -g`
docker compose up --build
```

- Website: <http://localhost:5173>
- Admin: <http://localhost:8000> (API docs at <http://localhost:8000/docs>)

**First run: download the images.** The repository ships the data but not the
pictures. Fetch them once from NASA/ESA/ESO/NOIRLab (a few hundred MB of originals,
a few minutes) and commit the generated web sizes:

```bash
docker compose run --rm api python -m app.cli fetch-images
git add frontend/public/images frontend/public/og-image.jpg frontend/public/data/nebulae.json
git commit -m "Add nebula images"
```

Until then the site works but shows an "Image unavailable" placeholder for each nebula.

### Without Docker

Requirements: Node.js 22.12+ and Python 3.11+.

```bash
# Website
cd frontend
npm ci
npm run dev                       # http://localhost:5173

# Admin (second terminal)
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.cli fetch-images    # first run only
uvicorn app.main:app --reload     # http://127.0.0.1:8000
```

## Add a nebula

**With the admin** (<http://localhost:8000>): click **New nebula**, fill in the
form and save. Then open it with **Edit** and either upload an image or click
**Fetch from download URL**. The website picks up the change on reload.

**By hand:** add an object to `frontend/public/data/nebulae.json`, then run
`python -m app.cli fetch-images <id>` (or `build-images <id>` if you put the
original in `media/originals/` yourself), and `python -m app.cli validate`.

```json
{
  "id": "cats-eye",
  "name": "Cat's Eye Nebula",
  "catalog": "NGC 6543",
  "nickname": "Cat's Eye",
  "type": "Planetary",
  "constellation": "Draco",
  "distance": 3000,
  "size": "less than a light-year across (bright core)",
  "description": "One or two short paragraphs.",
  "facts": ["Up to eight short facts."],
  "image_path": "images/nebulae/cats-eye",
  "image_alt": "Describe what the picture shows, for people who can't see it.",
  "credits": "ESA, NASA, HEIC and The Hubble Heritage Team (STScI/AURA)",
  "source_url": "https://cdn.esahubble.org/archives/images/publicationjpg/heic0414a.jpg",
  "source_page": "https://esahubble.org/images/heic0414a/"
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | URL slug: lowercase letters, numbers, hyphens. Becomes `/nebula/<id>`. |
| `name`, `constellation`, `description` | yes | |
| `type` | yes | `Emission`, `Reflection`, `Planetary`, `Supernova remnant` or `Dark` |
| `distance` | yes | Light-years, as a number. Shown as "~3,000 light-years". |
| `size` | yes | Free text, e.g. "about 25 light-years across". |
| `image_alt` | yes | Alt text for the picture. |
| `credits` | yes | Image credit, shown in the dialog and on the Contact page. |
| `catalog`, `nickname`, `facts` | no | The nickname is shown as the heading above the description. |
| `image_path` | no | Defaults to `images/nebulae/<id>`. |
| `source_url` | no | Direct link to the image file, used by `fetch-images`. |
| `source_page` | no | Human-readable source page, linked from the credit. |
| `image` | — | **Generated** by the image tools; don't edit. |

The order of entries is the order on the puzzle and in the gallery. Invalid
entries are skipped by the website (and reported by `validate`), so one mistake
never takes the site down.

## Add or change images

Every nebula needs one large original (ideally 2,000–4,000 px wide; JPEG, PNG,
WebP, TIFF or AVIF). From it the pipeline generates, in
`frontend/public/images/nebulae/<id>/`:

- `320/640/960/1280/1920/2560 .avif` and `.webp` (only sizes up to the original's width),
- `og.jpg`, a 1200×630 crop for social sharing,
- and, in `nebulae.json`, the intrinsic size, a 24 px blurred placeholder and the average colour.

Ways to add one:

1. **Admin:** Edit → choose a file → *Upload & build sizes*.
2. **From a URL:** set `source_url` and run `python -m app.cli fetch-images <id>`
   (or click *Fetch from download URL* in the admin). ESA/Hubble, ESA/Webb, ESO and
   NOIRLab archive URLs automatically fall back to a smaller size if one is missing.
3. **Manually:** save the file as `media/originals/<id>.jpg` and run
   `python -m app.cli build-images <id>`.

Commit the generated files in `frontend/public/images/` (the originals in
`media/originals/` stay out of git). The site-wide share image
`frontend/public/og-image.jpg` is rebuilt automatically as a collage of the first
eight nebulae; rebuild it by hand with `python -m app.cli og`.

Prefer public-domain (NASA) or CC BY 4.0 (ESA, ESO, NOIRLab) images and always
fill in `credits`.

## Build

```bash
cd frontend
VITE_SITE_URL=https://<user>.github.io/<repo>/ npm run build     # output in frontend/dist
python scripts/serve_pages.py dist --base /<repo>/               # preview it like GitHub Pages
```

or `docker compose --profile preview up --build preview` for a production build at
<http://localhost:4173>.

`VITE_SITE_URL` decides the base path (`/<repo>/`) and every absolute URL
(canonical, Open Graph, sitemap). The build prints a warning if a nebula has no
images yet.

If you change the admin UI's Tailwind classes, rebuild its CSS with
`npm run build:admin` (from `frontend/`).

## Test

```bash
cd frontend && npm test          # Vitest: parsing, search, filtering, routes, puzzle, SEO,
                                 # and the app: routing, 404s, dialog open/close, focus trap,
                                 # previous/next, keyboard, loading/error/empty states
cd backend && python -m pytest   # models, JSON store, API CRUD, uploads, image pipeline
```

In Docker: `docker build --target test frontend` and
`docker build --target test -t atlas-api-test backend && docker run --rm atlas-api-test`.

## Deploy to GitHub Pages

1. Push the repository to GitHub (with the images committed, see above).
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/deploy.yml` runs the backend
   and frontend tests, validates `nebulae.json`, runs `npm audit`, builds with the
   correct Pages URL and deploys. Pull requests run the same checks without deploying.

The site is served at `https://<user>.github.io/<repo>/`. Unknown URLs get the
custom 404 page with a real 404 status.

**Custom domain:** add it under Settings → Pages, then create a repository
variable `SITE_URL` (Settings → Secrets and variables → Actions → Variables),
e.g. `https://nebulae.example.com/`, so canonical URLs and the sitemap use it.
An optional `CONTACT_EMAIL` variable adds an email link to the Contact page.

> **About `robots.txt`:** crawlers only read it at the root of a host. On a
> project site (`<user>.github.io/<repo>/`) submit the sitemap
> (`…/<repo>/sitemap.xml`) in Google Search Console instead; with a custom domain
> or a `<user>.github.io` repository it works as is.

## Configuration

Copy `.env.example` to `.env` at the repository root; Docker Compose and Vite both read it.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_SITE_URL` | `http://localhost:5173/` | Public URL of the site (set automatically in CI) |
| `VITE_REPO_URL`, `VITE_CONTACT_EMAIL` | empty | Optional links on the Contact page |
| `VITE_USE_POLLING` | `false` | Use polling if hot reload misses changes in Docker |
| `MAX_UPLOAD_MB` | `60` | Largest image the admin accepts |
| `LOCAL_UID`, `LOCAL_GID` | `1000` | Run the admin container as you, so written files stay yours |
| `SITE_DIR`, `DATA_FILE`, `ORIGINALS_DIR` | repo layout | Admin paths, if you move things |

Tuning constants (puzzle speed, gallery page size) live in `frontend/src/config.js`;
colours and breakpoints in `frontend/src/styles/index.css`.

## Quality notes

Final audit of a production build (Lighthouse 13, Chromium, served like GitHub Pages):

| Page | Performance (mobile / desktop) | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| Home | 97 / 100 | 100 | 100 | 100 |
| Gallery | 97 / 100 | 100 | 100 | 100 |
| Nebula page | 99 / 100 | 100 | 100 | 100 |
| Discover | 97 / 100 | 100 | 100 | 100 |
| Contact | 98 / 100 | 100 | 100 | 100 |

Cumulative layout shift is 0 on every page. axe-core reports no violations
(WCAG 2.2 AA + best practices) on any page including the 404 page and "no
results" state, in both themes, at phone and desktop sizes, and with the dialog open. Initial JavaScript is ~100 kB gzipped
(mostly React). Scores were measured with stand-in images; real photographs are
larger but use the same responsive sizes.

Breakpoints: mobile < 640 px, tablet 640–1024 px, desktop 1024–1440 px, large > 1440 px.

## Credits

Images: NASA, ESA/Hubble, ESA/Webb, ESO and NSF NOIRLab (credit for each image is
in `nebulae.json` and on the Contact page). Icons: [Font Awesome Free](https://fontawesome.com/license/free)
(CC BY 4.0). Distances and sizes are approximate and taken from the image
publishers and published catalogues.
