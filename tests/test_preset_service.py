from pathlib import Path

from app.services.preset_service import PresetService


def test_load_presets_creates_default_file(tmp_path: Path) -> None:
    preset_path = tmp_path / "presets.json"
    service = PresetService(preset_path)
    presets = service.load_presets()

    assert preset_path.exists()
    assert "top_left" in presets
    assert presets["top_left"].built_in is True
