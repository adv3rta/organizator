from __future__ import annotations

from pathlib import Path

from app.core.exceptions import ValidationError

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
MP3_EXTENSIONS = {".mp3"}
WATERMARK_IMAGE_EXTENSIONS = {".png"}


def ensure_existing_file(path: Path) -> Path:
    if not path.exists() or not path.is_file():
        raise ValidationError(f"File does not exist: {path}")
    return path


def ensure_extension(path: Path, allowed_extensions: set[str], label: str) -> Path:
    ensure_existing_file(path)
    if path.suffix.lower() not in allowed_extensions:
        allowed = ", ".join(sorted(allowed_extensions))
        raise ValidationError(f"{label} must be one of: {allowed}")
    return path


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))
