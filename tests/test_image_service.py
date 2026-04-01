from pathlib import Path

from PIL import Image

from app.services.image_service import ImageService


def test_slice_to_squares_adds_transparent_padding(tmp_path: Path) -> None:
    source = tmp_path / "source.png"
    image = Image.new("RGBA", (30, 20), (255, 0, 0, 255))
    image.save(source)

    out_dir = tmp_path / "out"
    service = ImageService()
    paths = service.slice_to_squares(source, square_size=16, output_dir=out_dir)

    assert len(paths) == 4
    tile = Image.open(paths[-1]).convert("RGBA")
    assert tile.size == (16, 16)
