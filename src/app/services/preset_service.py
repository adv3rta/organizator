from __future__ import annotations

import json
from pathlib import Path

from app.core.exceptions import ValidationError
from app.models import WatermarkPreset

class PresetService:
    def __init__(self, preset_file: Path | None = None) -> None:
        self.preset_file = preset_file or Path("presets.json")
        self.default_presets: dict[str, WatermarkPreset] = {
            "top_left": WatermarkPreset("top_left", 0.05, 0.05, 0.6, 0.2, built_in=True),
            "top_right": WatermarkPreset("top_right", 0.75, 0.05, 0.6, 0.2, built_in=True),
            "bottom_left": WatermarkPreset("bottom_left", 0.05, 0.8, 0.6, 0.2, built_in=True),
            "bottom_right": WatermarkPreset("bottom_right", 0.75, 0.8, 0.6, 0.2, built_in=True),
        }

    def load_presets(self) -> dict[str, WatermarkPreset]:
        if not self.preset_file.exists():
            self.save_presets(self.default_presets)
            return dict(self.default_presets)

        raw = json.loads(self.preset_file.read_text(encoding="utf-8"))
        merged = dict(self.default_presets)
        for name, payload in raw.items():
            merged[name] = WatermarkPreset.from_dict(name, payload, built_in=name in self.default_presets)
        return merged

    def save_presets(self, presets: dict[str, WatermarkPreset]) -> None:
        serializable = {name: preset.to_dict() for name, preset in presets.items()}
        self.preset_file.write_text(json.dumps(serializable, indent=2), encoding="utf-8")

    def upsert_preset(self, presets: dict[str, WatermarkPreset], preset: WatermarkPreset) -> dict[str, WatermarkPreset]:
        key = Path(preset.name.strip()).stem
        if not key:
            raise ValidationError("Preset name is required.")
        presets[key] = WatermarkPreset(
            name=key,
            x_ratio=preset.x_ratio,
            y_ratio=preset.y_ratio,
            opacity=preset.opacity,
            scale=preset.scale,
            rotation=preset.rotation,
            built_in=key in self.default_presets,
        )
        self.save_presets(presets)
        return presets

    def delete_preset(self, presets: dict[str, WatermarkPreset], name: str) -> dict[str, WatermarkPreset]:
        if name in self.default_presets:
            raise ValidationError("Built-in presets cannot be deleted.")
        presets.pop(name, None)
        self.save_presets(presets)
        return presets
