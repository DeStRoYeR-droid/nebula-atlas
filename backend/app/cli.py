"""Command-line tools for the nebula data and images.

Run from ``backend/`` (or inside the api container)::

    python -m app.cli validate
    python -m app.cli fetch-images            # download every source_url, build derivatives
    python -m app.cli fetch-images eagle crab --force
    python -m app.cli build-images            # rebuild derivatives from media/originals
    python -m app.cli og                      # rebuild the site-wide share image
"""

from __future__ import annotations

import argparse
import sys
import time

from .config import get_settings
from .images import ImageError, find_original
from .service import AtlasService, MissingOriginalError
from .sources import DownloadError
from .store import DataFileError


def _selected(service: AtlasService, ids: list[str]):
    nebulae = service.store.list()
    if not ids:
        return nebulae
    known = {n.id: n for n in nebulae}
    missing = [i for i in ids if i not in known]
    if missing:
        raise SystemExit(f"Unknown id(s): {', '.join(missing)}")
    return [known[i] for i in ids]


def cmd_validate(service: AtlasService, _: argparse.Namespace) -> int:
    nebulae = service.store.list()
    without_images = [n.id for n in nebulae if n.image is None]
    print(f"OK: {len(nebulae)} nebulae in {service.settings.data_file}")
    if without_images:
        print(f"Note: no generated images yet for: {', '.join(without_images)}")
    return 0


def cmd_fetch(service: AtlasService, args: argparse.Namespace) -> int:
    failures = 0
    for nebula in _selected(service, args.ids):
        have_original = find_original(service.settings.originals_dir, nebula.id) is not None
        try:
            if have_original and not args.force:
                print(f"  {nebula.id}: original already downloaded, rebuilding derivatives")
                service.rebuild_image(nebula.id)
                continue
            if not nebula.source_url:
                print(f"  {nebula.id}: skipped (no source_url)")
                continue
            print(f"  {nebula.id}: downloading {nebula.source_url}")
            started = time.monotonic()
            service.fetch_source(nebula.id)
            print(f"  {nebula.id}: done in {time.monotonic() - started:.1f}s")
        except (DownloadError, ImageError, MissingOriginalError) as exc:
            failures += 1
            print(f"  {nebula.id}: FAILED - {exc}", file=sys.stderr)
    print("Finished" + (f" with {failures} failure(s)" if failures else ""))
    return 1 if failures else 0


def cmd_build(service: AtlasService, args: argparse.Namespace) -> int:
    failures = 0
    for nebula in _selected(service, args.ids):
        try:
            service.rebuild_image(nebula.id)
            print(f"  {nebula.id}: built")
        except (ImageError, MissingOriginalError) as exc:
            failures += 1
            print(f"  {nebula.id}: FAILED - {exc}", file=sys.stderr)
    return 1 if failures else 0


def cmd_og(service: AtlasService, _: argparse.Namespace) -> int:
    path = service.rebuild_site_og()
    print(f"Wrote {path}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli", description=__doc__.split("\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("validate", help="check nebulae.json against the schema")

    fetch = sub.add_parser("fetch-images", help="download originals from source_url and build derivatives")
    fetch.add_argument("ids", nargs="*", help="only these nebula ids (default: all)")
    fetch.add_argument("--force", action="store_true", help="download again even if an original exists")

    build = sub.add_parser("build-images", help="rebuild derivatives from media/originals")
    build.add_argument("ids", nargs="*", help="only these nebula ids (default: all)")

    sub.add_parser("og", help="rebuild the site-wide Open Graph image")

    args = parser.parse_args(argv)
    service = AtlasService(get_settings())
    handlers = {"validate": cmd_validate, "fetch-images": cmd_fetch, "build-images": cmd_build, "og": cmd_og}
    try:
        return handlers[args.command](service, args)
    except DataFileError as exc:
        print(f"Invalid data: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
