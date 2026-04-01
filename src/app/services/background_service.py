from __future__ import annotations

import logging
from io import BytesIO
from pathlib import Path

from PIL import Image
from PIL import ImageSequence
from rembg import new_session, remove

from app.core.exceptions import ProcessingError

logger = logging.getLogger(__name__)


class BackgroundService:
    def __init__(self) -> None:
        self._session = None

    def _session_or_create(self):
        if self._session is None:
            # Keep one session alive for faster repeated operations.
            self._session = new_session("u2net")
        return self._session

    def remove_background_image(self, file_path: Path, output_dir: Path) -> Path:
        try:
            output_dir.mkdir(parents=True, exist_ok=True)
            input_bytes = file_path.read_bytes()
            output_bytes = remove(input_bytes, session=self._session_or_create())
            out_path = output_dir / f"{file_path.stem}_nobg.png"
            out_path.write_bytes(output_bytes)
            logger.info("Background removed for image '%s'", file_path)
            return out_path
        except Exception as exc:  # pragma: no cover
            logger.exception("Background removal failed for image '%s'", file_path)
            raise ProcessingError(f"Failed to remove background: {file_path.name}") from exc

    def remove_background_gif(self, file_path: Path, output_dir: Path) -> Path:
        try:
            output_dir.mkdir(parents=True, exist_ok=True)
            with Image.open(file_path) as gif:
                # Pillow stores per-frame timing in frame.info["duration"] (ms).
                durations: list[int] = []
                out_frames: list[Image.Image] = []

                for frame in ImageSequence.Iterator(gif):
                    durations.append(int(frame.info.get("duration", 100)))
                    frame_rgba = frame.convert("RGBA")

                    stream = BytesIO()
                    frame_rgba.save(stream, format="PNG")
                    removed = remove(stream.getvalue(), session=self._session_or_create())
                    processed_frame = Image.open(BytesIO(removed)).convert("RGBA")
                    out_frames.append(processed_frame)

                if not out_frames:
                    raise ProcessingError(f"Failed to read GIF frames: {file_path.name}")

                avg_duration_ms = int(sum(durations) / max(1, len(durations)))
                out_path = output_dir / f"{file_path.stem}_nobg.gif"

                # Note: GIF supports only 1-bit transparency, so Pillow may quantize alpha.
                out_frames[0].save(
                    out_path,
                    format="GIF",
                    save_all=True,
                    append_images=out_frames[1:],
                    duration=avg_duration_ms,
                    loop=0,
                    disposal=2,
                )

            logger.info("Background removed for GIF '%s'", file_path)
            return out_path
        except Exception as exc:  # pragma: no cover
            logger.exception("Background removal failed for GIF '%s'", file_path)
            raise ProcessingError(f"Failed to remove GIF background: {file_path.name}") from exc
