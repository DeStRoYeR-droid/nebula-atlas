# ---------------------------------------------------------------------------
# base: Python + runtime dependencies + the app
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app
COPY requirements.txt ./
RUN pip install -r requirements.txt
COPY app ./app

# Unprivileged user. docker-compose.yml runs the container as your own UID/GID
# so files written into the mounted folders stay owned by you.
RUN useradd --create-home --uid 1000 atlas

# ---------------------------------------------------------------------------
# test: docker build --target test -t nebula-atlas-api-test backend
#       docker run --rm nebula-atlas-api-test
# (The check of the shipped nebulae.json is skipped here; CI runs it.)
# ---------------------------------------------------------------------------
FROM base AS test
COPY requirements-dev.txt pyproject.toml ./
RUN pip install -r requirements-dev.txt
COPY tests ./tests
USER atlas
CMD ["python", "-m", "pytest"]

# ---------------------------------------------------------------------------
# runtime (default): the admin API
# ---------------------------------------------------------------------------
FROM base AS runtime
USER atlas
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=2)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
