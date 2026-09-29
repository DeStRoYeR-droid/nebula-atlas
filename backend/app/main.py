"""FastAPI app: a small local admin for editing ``nebulae.json``.

Run it with ``uvicorn app.main:app --reload`` (from ``backend/``) or with
``docker compose up api``. It is meant for local use only: it has no
authentication and should never be exposed to the internet.
"""

from __future__ import annotations

from pathlib import Path as FsPath
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, Path, Request, Response, UploadFile, status
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import Settings, get_settings
from .images import ImageError
from .models import NEBULA_TYPES, SLUG_PATTERN, Nebula, NebulaInput, slugify
from .service import AtlasService, MissingOriginalError
from .sources import DownloadError
from .store import ConflictError, DataFileError, NotFoundError

ADMIN_DIR = FsPath(__file__).parent / "admin"

NebulaId = Annotated[str, Path(pattern=SLUG_PATTERN, max_length=60)]

SECURITY_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; "
        "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
    ),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
}


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    service = AtlasService(settings)

    app = FastAPI(
        title="Nebula Atlas admin",
        version="1.0.0",
        description="Local CRUD API for the nebula data behind the Nebula Atlas website.",
    )
    app.state.service = service

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        for header, value in SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)
        return response

    # -- error mapping -----------------------------------------------------
    def _error(code: int, message: str) -> JSONResponse:
        return JSONResponse(status_code=code, content={"detail": message})

    @app.exception_handler(NotFoundError)
    async def _not_found(_: Request, exc: NotFoundError):
        return _error(404, f"Nebula '{exc}' not found")

    @app.exception_handler(ConflictError)
    async def _conflict(_: Request, exc: ConflictError):
        return _error(409, f"A nebula with id '{exc}' already exists")

    @app.exception_handler(DataFileError)
    async def _bad_data(_: Request, exc: DataFileError):
        return _error(500, str(exc))

    @app.exception_handler(ImageError)
    async def _bad_image(_: Request, exc: ImageError):
        return _error(422, str(exc))

    @app.exception_handler(MissingOriginalError)
    async def _missing_original(_: Request, exc: MissingOriginalError):
        return _error(409, str(exc))

    @app.exception_handler(DownloadError)
    async def _download_failed(_: Request, exc: DownloadError):
        return _error(502, f"Download failed: {exc}")

    # -- routes ------------------------------------------------------------
    @app.get("/api/health", tags=["meta"])
    def health() -> dict:
        return {"status": "ok"}

    @app.get("/api/meta", tags=["meta"])
    def meta() -> dict:
        return {"types": list(NEBULA_TYPES), "data_file": settings.data_file.name}

    @app.get("/api/nebulae", response_model=list[Nebula], response_model_exclude_none=True, tags=["nebulae"])
    def list_nebulae() -> list[Nebula]:
        return service.store.list()

    @app.get("/api/nebulae/{nebula_id}", response_model=Nebula, response_model_exclude_none=True, tags=["nebulae"])
    def get_nebula(nebula_id: NebulaId) -> Nebula:
        return service.store.get(nebula_id)

    @app.post(
        "/api/nebulae",
        response_model=Nebula,
        response_model_exclude_none=True,
        status_code=status.HTTP_201_CREATED,
        tags=["nebulae"],
    )
    def create_nebula(payload: NebulaInput) -> Nebula:
        if not payload.id:
            payload.id = slugify(payload.name)
            if not payload.id:
                raise HTTPException(422, "Could not derive an id from the name; please provide one")
        return service.store.create(payload)

    @app.put("/api/nebulae/{nebula_id}", response_model=Nebula, response_model_exclude_none=True, tags=["nebulae"])
    def update_nebula(nebula_id: NebulaId, payload: NebulaInput) -> Nebula:
        if payload.id and payload.id != nebula_id:
            raise HTTPException(422, "The id cannot be changed. Create a new nebula instead.")
        return service.store.update(nebula_id, payload)

    @app.delete("/api/nebulae/{nebula_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["nebulae"])
    def delete_nebula(nebula_id: NebulaId) -> Response:
        service.delete(nebula_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @app.post(
        "/api/nebulae/{nebula_id}/image", response_model=Nebula, response_model_exclude_none=True, tags=["images"]
    )
    def upload_image(request: Request, nebula_id: NebulaId, file: Annotated[UploadFile, File()]) -> Nebula:
        declared = int(request.headers.get("content-length") or 0)
        if declared > settings.max_upload_bytes + 1024 * 64:
            raise HTTPException(413, f"File is larger than {settings.max_upload_bytes // (1024 * 1024)} MB")
        return service.attach_upload(nebula_id, file.file)

    @app.post(
        "/api/nebulae/{nebula_id}/image/fetch", response_model=Nebula, response_model_exclude_none=True, tags=["images"]
    )
    def fetch_image(nebula_id: NebulaId) -> Nebula:
        return service.fetch_source(nebula_id)

    @app.post(
        "/api/nebulae/{nebula_id}/image/rebuild",
        response_model=Nebula,
        response_model_exclude_none=True,
        tags=["images"],
    )
    def rebuild_image(nebula_id: NebulaId) -> Nebula:
        return service.rebuild_image(nebula_id)

    # -- static files ------------------------------------------------------
    # Generated images, so the admin can show previews.
    app.mount("/site", StaticFiles(directory=settings.site_dir, check_dir=False), name="site")
    # The admin UI itself (plain HTML + JS, styled with Tailwind).
    app.mount("/", StaticFiles(directory=ADMIN_DIR, html=True), name="admin")
    return app


app = create_app()
