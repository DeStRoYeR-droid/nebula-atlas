from __future__ import annotations

import json

import pytest
from pydantic import ValidationError

from app.models import KEY_ORDER, Nebula, NebulaInput, slugify
from app.store import ConflictError, DataFileError, NebulaStore, NotFoundError, parse_document

from .conftest import REPO_DATA, make_entry


@pytest.mark.skipif(not REPO_DATA.exists(), reason="run from a full checkout to validate the shipped data")
def test_repository_data_is_valid():
    """The nebulae.json shipped with the site must always pass validation."""
    nebulae = parse_document(json.loads(REPO_DATA.read_text(encoding="utf-8")))
    assert len(nebulae) >= 16
    assert all(n.image_alt.strip() for n in nebulae), "every nebula needs alt text"


def test_blank_optional_fields_become_none_and_blank_facts_are_dropped():
    nebula = Nebula.model_validate(make_entry(catalog="  ", facts=["One.", " ", ""]))
    assert nebula.catalog is None
    assert nebula.facts == ["One."]


def test_image_path_defaults_from_id():
    entry = make_entry("north-america")
    del entry["image_path"]
    assert Nebula.model_validate(entry).image_path == "images/nebulae/north-america"


@pytest.mark.parametrize("bad_id", ["Eagle", "eagle nebula", "../etc", "eagle_", "-eagle", ""])
def test_rejects_bad_ids(bad_id):
    with pytest.raises(ValidationError):
        Nebula.model_validate(make_entry(bad_id))


@pytest.mark.parametrize("bad_path", ["../secrets", "/etc/passwd", "images/../../x", "images/Eagle"])
def test_rejects_unsafe_image_paths(bad_path):
    with pytest.raises(ValidationError):
        Nebula.model_validate(make_entry(image_path=bad_path))


def test_rejects_unknown_type_and_unknown_fields():
    with pytest.raises(ValidationError):
        Nebula.model_validate(make_entry(type="Galaxy"))
    with pytest.raises(ValidationError):
        Nebula.model_validate(make_entry(colour="red"))


def test_to_json_uses_stable_key_order_and_whole_number_distance():
    data = Nebula.model_validate(make_entry(distance=5700.0)).to_json()
    assert list(data) == [k for k in KEY_ORDER if k in data]
    assert data["distance"] == 5700 and isinstance(data["distance"], int)
    assert "nickname" not in data  # None fields are omitted


def test_slugify():
    assert slugify("North America Nebula") == "north-america"
    assert slugify("  Eagle Nebula (M16) ") == "eagle-m16"


def test_parse_document_accepts_bare_list_and_rejects_duplicates():
    assert len(parse_document([make_entry("a"), make_entry("b")])) == 2
    with pytest.raises(DataFileError, match="duplicate"):
        parse_document({"nebulae": [make_entry("a"), make_entry("a")]})
    with pytest.raises(DataFileError):
        parse_document({"items": []})


def test_store_crud_round_trip(settings):
    store = NebulaStore(settings.data_file)
    assert [n.id for n in store.list()] == ["eagle", "crab"]

    created = store.create(NebulaInput.model_validate(make_entry("ring", type="Planetary")))
    assert created.image_path == "images/nebulae/ring"
    with pytest.raises(ConflictError):
        store.create(NebulaInput.model_validate(make_entry("ring", type="Planetary")))

    updated = store.update("ring", NebulaInput.model_validate(make_entry("ring", name="Ring", type="Planetary")))
    assert updated.name == "Ring"

    store.delete("ring")
    with pytest.raises(NotFoundError):
        store.get("ring")

    # The file on disk is still valid, pretty-printed JSON with the canonical shape.
    document = json.loads(settings.data_file.read_text())
    assert [n["id"] for n in document["nebulae"]] == ["eagle", "crab"]
    assert settings.data_file.read_text().endswith("}\n")
    assert not list(settings.data_file.parent.glob(".nebulae-*"))  # no temp files left behind


def test_update_keeps_generated_image_metadata(settings):
    store = NebulaStore(settings.data_file)
    meta = {
        "width": 640,
        "height": 400,
        "widths": [320, 640],
        "formats": ["avif", "webp"],
        "placeholder": "data:image/webp;base64,AAAA",
        "color": "#112233",
    }
    store.set_image("eagle", meta)
    store.update("eagle", NebulaInput.model_validate(make_entry("eagle", name="Renamed")))
    assert store.get("eagle").image.width == 640


def test_missing_file_is_an_empty_atlas(tmp_path):
    assert NebulaStore(tmp_path / "nope.json").list() == []


def test_invalid_json_raises_data_file_error(tmp_path):
    path = tmp_path / "broken.json"
    path.write_text("{not json")
    with pytest.raises(DataFileError):
        NebulaStore(path).list()
