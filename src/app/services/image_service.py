from __future__ import annotations

import logging
from pathlib import Path

from PIL import Image

from app.core.exceptions import ProcessingError, ValidationError
from app.core.validators import IMAGE_EXTENSIONS, ensure_extension

logger = logging.getLogger(__name__)


class ImageService:
    def slice_to_squares(self, file_path: Path, square_size: int, output_dir: Path) -> list[Path]:
        if square_size <= 0:
            raise ValidationError("Square size must be > 0.")
        ensure_extension(file_path, IMAGE_EXTENSIONS, "Source image")

        try:
            output_dir.mkdir(parents=True, exist_ok=True)
            with Image.open(file_path) as src:
                image = src.convert("RGBA")
                width, height = image.size

                padded_width = ((width + square_size - 1) // square_size) * square_size
                padded_height = ((height + square_size - 1) // square_size) * square_size

                canvas = Image.new("RGBA", (padded_width, padded_height), (0, 0, 0, 0))
                canvas.paste(image, (0, 0))

                output_paths: list[Path] = []
                index = 0
                for top in range(0, padded_height, square_size):
                    for left in range(0, padded_width, square_size):
                        tile = canvas.crop((left, top, left + square_size, top + square_size))
                        out_path = output_dir / f"{file_path.stem}_tile_{index:03d}.png"
                        tile.save(out_path, "PNG")
                        output_paths.append(out_path)
                        index += 1

                logger.info("Sliced image '%s' into %s squares.", file_path, len(output_paths))
                return output_paths
        except Exception as exc:  # pragma: no cover
            logger.exception("Image slicing failed for '%s'", file_path)
            raise ProcessingError(f"Failed to slice image: {file_path.name}") from exc
