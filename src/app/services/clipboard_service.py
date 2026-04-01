from __future__ import annotations

import logging

from PySide6.QtGui import QGuiApplication

from app.core.error_codes import ErrorCodes

logger = logging.getLogger(__name__)


class ClipboardService:
    """Small clipboard wrapper to keep UI code lighter."""

    def copy_text(self, text: str, label: str) -> None:
        QGuiApplication.clipboard().setText(text)
        logger.info(
            "Clipboard updated",
            extra={"error_code": ErrorCodes.CLIPBOARD_COPY, "context": {"label": label, "length": len(text)}},
        )
