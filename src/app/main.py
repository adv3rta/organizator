from __future__ import annotations

import logging
import sys

from PySide6.QtWidgets import QApplication

from app.core.logging_config import setup_logging
from app.ui.main_window import MainWindow


def main() -> int:
    setup_logging()
    app = QApplication(sys.argv)
    app.setApplicationName("organizator")
    window = MainWindow()
    window.show()
    logging.getLogger(__name__).info("Application started")
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
