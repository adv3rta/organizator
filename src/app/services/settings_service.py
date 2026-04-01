from __future__ import annotations

import json
import logging
from pathlib import Path

from app.core.error_codes import ErrorCodes
from app.core.exceptions import ProcessingError
from app.models import AppSettings

logger = logging.getLogger(__name__)


class SettingsService:
    def __init__(self, settings_file: Path | None = None) -> None:
        self._settings_file = settings_file or Path("settings.json")

    def load(self) -> AppSettings:
        if not self._settings_file.exists():
            settings = AppSettings()
            self.save(settings)
            return settings

        try:
            payload = json.loads(self._settings_file.read_text(encoding="utf-8"))
            return AppSettings.from_dict(payload)
        except Exception:
            logger.exception(
                "Failed to load settings from %s",
                self._settings_file,
                extra={"error_code": ErrorCodes.SETTINGS_LOAD, "context": {"path": str(self._settings_file)}},
            )
            fallback = AppSettings()
            self.save(fallback)
            return fallback

    def save(self, settings: AppSettings) -> None:
        try:
            self._settings_file.write_text(
                json.dumps(settings.to_dict(), indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            logger.info(
                "Settings saved",
                extra={"error_code": ErrorCodes.SETTINGS_SAVE, "context": {"path": str(self._settings_file)}},
            )
        except OSError as exc:
            logger.exception(
                "Failed to save settings",
                extra={"error_code": ErrorCodes.SETTINGS_SAVE, "context": {"path": str(self._settings_file)}},
            )
            raise ProcessingError("Unable to save settings.", code=ErrorCodes.SETTINGS_SAVE) from exc
