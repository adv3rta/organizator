from __future__ import annotations

import logging
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from app.core.exceptions import ProcessingError, ValidationError
from app.core.validators import IMAGE_EXTENSIONS, WATERMARK_IMAGE_EXTENSIONS, clamp, ensure_extension
from app.models import WatermarkRequest

logger = logging.getLogger(__name__)


class WatermarkService:
    def apply_watermark(self, request: WatermarkRequest) -> Path:
        ensure_extension(request.source_path, IMAGE_EXTENSIONS, "Source image")
        if request.watermark_image is not None:
            ensure_extension(request.watermark_image, WATERMARK_IMAGE_EXTENSIONS, "Watermark image")
        if not request.watermark_image and not request.watermark_text:
            raise ValidationError("Choose a PNG watermark or enter watermark text.")

        try:
            request.output_directory.mkdir(parents=True, exist_ok=True)
            with Image.open(request.source_path) as src:
                base = src.convert("RGBA")
                layer = Image.new("RGBA", base.size, (0, 0, 0, 0))

                if request.watermark_image:
                    with Image.open(request.watermark_image) as wm:
                        mark = wm.convert("RGBA")
                        width = max(24, int(base.width * clamp(request.scale, 0.05, 1.0)))
                        ratio = width / mark.width
                        height = max(20, int(mark.height * ratio))
                        mark = mark.resize((width, height), Image.Resampling.LANCZOS)
                else:
                    mark = self._text_watermark(request.watermark_text or "", base.width, request.scale)

                alpha = mark.getchannel("A")
                alpha = alpha.point(lambda px: int(px * clamp(request.opacity, 0.0, 1.0)))
                mark.putalpha(alpha)
                mark = mark.rotate(-request.rotation, expand=True, resample=Image.Resampling.BICUBIC)

                x = int((base.width - mark.width) * clamp(request.x_ratio, 0.0, 1.0))
                y = int((base.height - mark.height) * clamp(request.y_ratio, 0.0, 1.0))
                layer.paste(mark, (x, y), mark)

                merged = Image.alpha_composite(base, layer)
                out_path = request.output_directory / f"{request.source_path.stem}_watermarked.png"
                merged.save(out_path, "PNG")
                logger.info("Applied watermark to '%s'", request.source_path)
                return out_path
        except Exception as exc:  # pragma: no cover
            logger.exception("Watermark failed for '%s'", request.source_path)
            raise ProcessingError(f"Failed to apply watermark: {request.source_path.name}") from exc

    def _text_watermark(self, text: str, base_width: int, scale: float) -> Image.Image:
        font_size = max(16, int(base_width * clamp(scale, 0.05, 1.0) * 0.22))
        try:
            font = ImageFont.truetype("arial.ttf", size=font_size)
        except Exception:
            font = ImageFont.load_default()
        tmp = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
        draw = ImageDraw.Draw(tmp)
        box = draw.textbbox((0, 0), text, font=font)
        width = box[2] - box[0] + 20
        height = box[3] - box[1] + 20
        image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((0, 0, width - 1, height - 1), radius=16, fill=(8, 10, 16, 80))
        draw.text((10, 10), text, fill=(255, 255, 255, 255), font=font)
        return image
