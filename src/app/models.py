from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path


@dataclass(slots=True)
class AppSettings:
    theme: str = "dark"
    sound_enabled: bool = False
    notifications_enabled: bool = True
    export_directory: Path = field(default_factory=lambda: Path("exports"))
    notification_corner: str = "bottom-right"
    language: str = "en"

    def to_dict(self) -> dict[str, object]:
        payload = asdict(self)
        payload["export_directory"] = str(self.export_directory)
        return payload

    @classmethod
    def from_dict(cls, payload: dict[str, object]) -> "AppSettings":
        export_directory = payload.get("export_directory")
        theme = str(payload.get("theme", "dark"))
        return cls(
            theme=theme if theme in {"dark", "light"} else "dark",
            sound_enabled=bool(payload.get("sound_enabled", False)),
            notifications_enabled=bool(payload.get("notifications_enabled", True)),
            export_directory=Path(str(export_directory)) if export_directory else Path("exports"),
            notification_corner=str(payload.get("notification_corner", "bottom-right")),
            language=str(payload.get("language", "en")) if str(payload.get("language", "en")) in {"en", "ru"} else "en",
        )


@dataclass(slots=True)
class WatermarkPreset:
    name: str
    x_ratio: float
    y_ratio: float
    opacity: float
    scale: float
    rotation: float = 0.0
    built_in: bool = False

    def to_dict(self) -> dict[str, object]:
        return {
            "x": self.x_ratio,
            "y": self.y_ratio,
            "opacity": self.opacity,
            "scale": self.scale,
            "rotation": self.rotation,
        }

    @classmethod
    def from_dict(cls, name: str, payload: dict[str, object], built_in: bool = False) -> "WatermarkPreset":
        return cls(
            name=name,
            x_ratio=float(payload.get("x", 0.75)),
            y_ratio=float(payload.get("y", 0.8)),
            opacity=float(payload.get("opacity", 0.6)),
            scale=float(payload.get("scale", 0.2)),
            rotation=float(payload.get("rotation", 0.0)),
            built_in=built_in,
        )


@dataclass(slots=True)
class MetadataUpdate:
    title: str | None = None
    author: str | None = None
    tags: list[str] = field(default_factory=list)
    cover_image_path: Path | None = None


@dataclass(slots=True)
class WatermarkRequest:
    source_path: Path
    output_directory: Path
    x_ratio: float
    y_ratio: float
    opacity: float
    scale: float
    rotation: float
    watermark_image: Path | None = None
    watermark_text: str | None = None