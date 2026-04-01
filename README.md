# organizator

Offline Windows desktop app for image splitting, watermarking, MP3 metadata editing, and encoding/decoding text tools.

## Features

- Slice images into even square PNG tiles with transparent padding.
- Apply text or PNG watermarks with position, opacity, scale, and rotation controls.
- Use 4 built-in watermark presets and save, update, or delete custom presets.
- Edit MP3 metadata in batch: title, author, tags, and cover image.
- Encode and decode Morse, Binary, Base64, and Caesar cipher text.
- Show in-app toast notifications instead of blocking Windows message boxes.
- Drag and drop files or folders with visual feedback.
- Configure export folder, sounds, notifications, and language.
- Structured logging, error handling, and unit tests for core processing services.

## Tech stack

- Python 3.11+
- PySide6 (desktop UI)
- Pillow (image processing)
- mutagen (MP3 tags)
- pytest (tests)

## Run

```bash
pip install -r requirements.txt
python run_app.py
```

## Test

```bash
pytest -q
```

## Notes

- Output images are saved as PNG with transparency support.
- Splitter exports tiles into a folder named after the source file.
- Watermark and metadata exports also create per-file output folders under the shared export root.
- Presets are stored in `presets.json`, settings in `settings.json`.
- Logs are stored in `logs/app.log`.
