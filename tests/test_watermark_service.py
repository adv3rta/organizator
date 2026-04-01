from pathlib import Path

from PIL import Image

from app.models import WatermarkRequest
from app.services.watermark_service import WatermarkService


def test_apply_text_watermark_exports_png(tmp_path: Path) -> None:
    source = tmp_path / "image.png"
    Image.new("RGBA", (120, 80), (10, 20, 30, 255)).save(source)

    output_dir = tmp_path / "out"
    request = WatermarkRequest(
        source_path=source,
        output_directory=output_dir,
        x_ratio=0.5,
        y_ratio=0.5,
        opacity=0.7,
        scale=0.25,
        rotation=12,
        watermark_text="Demo",
    )

    result = WatermarkService().apply_watermark(request)

    assert result.exists()
    assert result.suffix.lower() == ".png"
