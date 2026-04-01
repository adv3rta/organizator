from __future__ import annotations

import logging
from pathlib import Path
import shutil

from mutagen.id3 import APIC, ID3, ID3NoHeaderError, TIT2, TPE1, TXXX

from app.core.exceptions import ProcessingError
from app.core.validators import IMAGE_EXTENSIONS, MP3_EXTENSIONS, ensure_existing_file, ensure_extension
from app.models import MetadataUpdate

logger = logging.getLogger(__name__)


class MetadataService:
    def create_tagged_copy(self, file_path: Path, output_dir: Path, update: MetadataUpdate) -> Path:
        ensure_extension(file_path, MP3_EXTENSIONS, "MP3 file")
        if update.cover_image_path is not None:
            ensure_extension(update.cover_image_path, IMAGE_EXTENSIONS, "Cover image")

        output_dir.mkdir(parents=True, exist_ok=True)
        out_file = output_dir / f"{file_path.stem}_edited.mp3"
        shutil.copy2(file_path, out_file)

        try:
            tags = ID3(out_file)
        except ID3NoHeaderError:
            tags = ID3()
        except Exception as exc:
            logger.exception("Unable to read ID3 tags from '%s'", file_path)
            raise ProcessingError(f"Failed to read metadata: {file_path.name}") from exc

        try:
            if update.title:
                tags["TIT2"] = TIT2(encoding=3, text=update.title)
            if update.author:
                tags["TPE1"] = TPE1(encoding=3, text=update.author)

            tags.delall("TXXX:Tags")
            if update.tags:
                tags.add(TXXX(encoding=3, desc="Tags", text=update.tags))

            if update.cover_image_path:
                ensure_existing_file(update.cover_image_path)
                suffix = update.cover_image_path.suffix.lower()
                mime = "image/jpeg" if suffix in {".jpg", ".jpeg"} else "image/png"
                tags["APIC:Cover"] = APIC(
                    encoding=3,
                    mime=mime,
                    type=3,
                    desc="Cover",
                    data=update.cover_image_path.read_bytes(),
                )

            tags.save(out_file)
            logger.info("Created tagged MP3 copy '%s' from '%s'", out_file, file_path)
            return out_file
        except Exception as exc:  # pragma: no cover
            logger.exception("Metadata update failed for '%s'", file_path)
            raise ProcessingError(f"Failed to update metadata: {file_path.name}") from exc
