from pathlib import Path

from mutagen.id3 import ID3

from app.models import MetadataUpdate
from app.services.metadata_service import MetadataService


def test_create_tagged_copy_updates_basic_fields(tmp_path: Path) -> None:
    source = tmp_path / "track.mp3"
    source.write_bytes(b"ID3")

    cover = tmp_path / "cover.png"
    cover.write_bytes(
        bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C6360606060000000050001A5F645400000000049454E44AE426082"
        )
    )

    update = MetadataUpdate(title="Song", author="Artist", tags=["ambient", "loop"], cover_image_path=cover)
    out_file = MetadataService().create_tagged_copy(source, tmp_path / "out", update)

    tags = ID3(out_file)
    assert tags["TIT2"].text[0] == "Song"
    assert tags["TPE1"].text[0] == "Artist"
    assert tags.getall("TXXX")[0].text == ["ambient", "loop"]
