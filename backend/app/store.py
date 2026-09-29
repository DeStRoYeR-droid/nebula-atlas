"""Read and write ``nebulae.json`` safely.

Writes are atomic (temp file + rename) and serialised with a lock, so a crash
or two quick saves can never leave a half-written file behind.
"""

from __future__ import annotations

import json
import os
import tempfile
import threading
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from .models import Nebula, NebulaInput, default_image_path


class StoreError(Exception):
    """Base class for store errors."""


class DataFileError(StoreError):
    """The JSON file exists but cannot be parsed or validated."""


class NotFoundError(StoreError):
    pass


class ConflictError(StoreError):
    pass


def parse_document(raw: Any) -> list[Nebula]:
    """Validate a decoded JSON document and return its nebulae.

    Accepts ``{"nebulae": [...]}`` (the canonical shape) or a bare list.
    """
    items = raw.get("nebulae") if isinstance(raw, dict) else raw
    if not isinstance(items, list):
        raise DataFileError('Expected an object with a "nebulae" list')

    nebulae: list[Nebula] = []
    seen: set[str] = set()
    problems: list[str] = []
    for position, item in enumerate(items):
        try:
            nebula = Nebula.model_validate(item)
        except ValidationError as exc:
            label = item.get("id", f"#{position}") if isinstance(item, dict) else f"#{position}"
            problems.append(f"{label}: {exc.errors()[0]['loc']} {exc.errors()[0]['msg']}")
            continue
        if nebula.id in seen:
            problems.append(f"{nebula.id}: duplicate id")
            continue
        seen.add(nebula.id)
        nebulae.append(nebula)
    if problems:
        raise DataFileError("Invalid entries in nebulae.json:\n  " + "\n  ".join(problems))
    return nebulae


class NebulaStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.RLock()

    # -- reading ---------------------------------------------------------
    def list(self) -> list[Nebula]:
        with self._lock:
            if not self.path.exists():
                return []
            try:
                raw = json.loads(self.path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                raise DataFileError(f"{self.path.name} is not valid JSON: {exc}") from exc
            return parse_document(raw)

    def get(self, nebula_id: str) -> Nebula:
        for nebula in self.list():
            if nebula.id == nebula_id:
                return nebula
        raise NotFoundError(nebula_id)

    # -- writing ---------------------------------------------------------
    def create(self, data: NebulaInput) -> Nebula:
        if not data.id:
            raise ValueError("id is required")
        with self._lock:
            nebulae = self.list()
            if any(n.id == data.id for n in nebulae):
                raise ConflictError(data.id)
            payload = data.model_dump(exclude_none=True)
            payload.setdefault("image_path", default_image_path(data.id))
            nebula = Nebula.model_validate(payload)
            nebulae.append(nebula)
            self._write(nebulae)
            return nebula

    def update(self, nebula_id: str, data: NebulaInput) -> Nebula:
        """Replace the editable fields. The id and generated image data are kept."""
        with self._lock:
            nebulae = self.list()
            index = self._index(nebulae, nebula_id)
            current = nebulae[index]
            payload = data.model_dump(exclude_none=True)
            payload["id"] = nebula_id
            payload.setdefault("image_path", current.image_path)
            if current.image is not None and payload["image_path"] == current.image_path:
                payload["image"] = current.image.model_dump()
            nebulae[index] = Nebula.model_validate(payload)
            self._write(nebulae)
            return nebulae[index]

    def set_image(self, nebula_id: str, image: dict[str, Any] | None) -> Nebula:
        with self._lock:
            nebulae = self.list()
            index = self._index(nebulae, nebula_id)
            payload = nebulae[index].model_dump(exclude_none=True)
            payload["image"] = image
            nebulae[index] = Nebula.model_validate(payload)
            self._write(nebulae)
            return nebulae[index]

    def delete(self, nebula_id: str) -> Nebula:
        with self._lock:
            nebulae = self.list()
            index = self._index(nebulae, nebula_id)
            removed = nebulae.pop(index)
            self._write(nebulae)
            return removed

    # -- helpers ---------------------------------------------------------
    @staticmethod
    def _index(nebulae: list[Nebula], nebula_id: str) -> int:
        for index, nebula in enumerate(nebulae):
            if nebula.id == nebula_id:
                return index
        raise NotFoundError(nebula_id)

    def _write(self, nebulae: list[Nebula]) -> None:
        document = {"nebulae": [n.to_json() for n in nebulae]}
        text = json.dumps(document, indent=2, ensure_ascii=False) + "\n"
        self.path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp_name = tempfile.mkstemp(prefix=".nebulae-", suffix=".json", dir=self.path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(text)
                handle.flush()
                os.fsync(handle.fileno())
            os.chmod(tmp_name, 0o644)
            os.replace(tmp_name, self.path)
        except BaseException:
            Path(tmp_name).unlink(missing_ok=True)
            raise
