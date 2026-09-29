# ---------------------------------------------------------------------------
# Dependencies (shared by every stage)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------------------------------------------------------------------------
# dev: Vite dev server with hot reload (used by `docker compose up`)
# ---------------------------------------------------------------------------
FROM deps AS dev
ENV VITE_HOST=0.0.0.0
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
# test: `docker build --target test frontend`
# ---------------------------------------------------------------------------
FROM deps AS test
COPY . .
RUN npm test

# ---------------------------------------------------------------------------
# build: the static site that gets deployed to GitHub Pages
# ---------------------------------------------------------------------------
FROM deps AS build
ARG VITE_SITE_URL=http://localhost:4173/
ARG VITE_REPO_URL=
ARG VITE_CONTACT_EMAIL=
ENV VITE_SITE_URL=$VITE_SITE_URL \
    VITE_REPO_URL=$VITE_REPO_URL \
    VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# preview: serves the build exactly like GitHub Pages (clean URLs, real 404s)
# ---------------------------------------------------------------------------
FROM python:3.12-alpine AS preview
ARG VITE_SITE_URL=http://localhost:4173/
ENV SITE_URL=$VITE_SITE_URL
WORKDIR /srv
COPY scripts/serve_pages.py ./serve_pages.py
COPY --from=build /app/dist ./site
USER nobody
EXPOSE 4173
# The base path ("/" or "/<repo>/") is read from SITE_URL, the URL the build used.
CMD ["python", "serve_pages.py", "site", "--host", "0.0.0.0", "--port", "4173"]
