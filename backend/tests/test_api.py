from __future__ import annotations

import io

from .conftest import make_entry


def test_health_and_security_headers(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]
    assert response.headers["x-content-type-options"] == "nosniff"


def test_admin_page_is_served(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "Nebula Atlas" in response.text


def test_list_and_get(client):
    listing = client.get("/api/nebulae").json()
    assert [n["id"] for n in listing] == ["eagle", "crab"]
    assert client.get("/api/nebulae/crab").json()["type"] == "Supernova remnant"


def test_unknown_and_malformed_ids(client):
    assert client.get("/api/nebulae/missing").status_code == 404
    assert client.get("/api/nebulae/Not%20A%20Slug").status_code == 422


def test_create_update_delete(client, settings):
    response = client.post("/api/nebulae", json=make_entry("ring", type="Planetary"))
    assert response.status_code == 201
    assert client.post("/api/nebulae", json=make_entry("ring", type="Planetary")).status_code == 409

    payload = make_entry("ring", type="Planetary", name="The Ring")
    assert client.put("/api/nebulae/ring", json=payload).json()["name"] == "The Ring"
    assert client.put("/api/nebulae/ring", json=make_entry("other", type="Planetary")).status_code == 422

    assert client.delete("/api/nebulae/ring").status_code == 204
    assert client.get("/api/nebulae/ring").status_code == 404
    assert client.delete("/api/nebulae/ring").status_code == 404


def test_create_derives_id_from_name(client):
    entry = make_entry("x", name="Cat's Eye Nebula")
    del entry["id"]
    response = client.post("/api/nebulae", json=entry)
    assert response.status_code == 201
    assert response.json()["id"] == "cat-s-eye"


def test_validation_errors_are_reported(client):
    response = client.post("/api/nebulae", json=make_entry("bad", distance=-5, type="Galaxy"))
    assert response.status_code == 422
    fields = {tuple(error["loc"])[-1] for error in response.json()["detail"]}
    assert {"distance", "type"} <= fields


def test_upload_builds_derivatives_and_updates_json(client, settings, jpeg_bytes):
    files = {"file": ("eagle.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
    response = client.post("/api/nebulae/eagle/image", files=files)
    assert response.status_code == 200, response.text

    image = response.json()["image"]
    assert image["widths"] == [320, 640, 960, 1280]
    assert image["width"] == 1280 and image["height"] == 823
    assert image["placeholder"].startswith("data:image/webp;base64,")

    folder = settings.site_dir / "images" / "nebulae" / "eagle"
    for width in image["widths"]:
        assert (folder / f"{width}.avif").is_file()
        assert (folder / f"{width}.webp").is_file()
    assert (folder / "og.jpg").is_file()
    assert (settings.site_dir / "og-image.jpg").is_file()
    assert (settings.originals_dir / "eagle.jpg").is_file()

    # Served for admin previews.
    assert client.get("/site/images/nebulae/eagle/320.webp").status_code == 200

    # Deleting the nebula removes its generated files.
    assert client.delete("/api/nebulae/eagle").status_code == 204
    assert not folder.exists()


def test_upload_rejects_non_images(client):
    files = {"file": ("notes.txt", io.BytesIO(b"definitely not an image"), "text/plain")}
    response = client.post("/api/nebulae/eagle/image", files=files)
    assert response.status_code == 422
    assert "not a supported image" in response.json()["detail"]


def test_upload_to_unknown_nebula_is_404(client, jpeg_bytes):
    files = {"file": ("x.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
    assert client.post("/api/nebulae/missing/image", files=files).status_code == 404


def test_rebuild_without_original_is_409(client):
    assert client.post("/api/nebulae/eagle/image/rebuild").status_code == 409
