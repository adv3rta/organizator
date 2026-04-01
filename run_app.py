from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
SRC = PROJECT_ROOT / "src"
sys.path.insert(0, str(SRC))

from app.main import main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(main())
