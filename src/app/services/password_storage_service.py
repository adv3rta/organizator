from __future__ import annotations

import json
import logging
from pathlib import Path
from uuid import uuid4

from app.core.error_codes import ErrorCodes
from app.core.exceptions import ProcessingError, ValidationError
from app.models import PasswordEntry

logger = logging.getLogger(__name__)


class PasswordStorageService:
    """Persist password entries in a local plain-text JSON file."""

    def __init__(self, storage_file: Path | None = None) -> None:
        self._storage_file = storage_file or Path("passwords.json")

    def load_entries(self) -> list[PasswordEntry]:
        if not self._storage_file.exists():
            return []
        try:
            payload = json.loads(self._storage_file.read_text(encoding="utf-8"))
            return [PasswordEntry.from_dict(item) for item in payload]
        except (OSError, json.JSONDecodeError) as exc:
            logger.exception(
                "Failed to load password entries",
                extra={"error_code": ErrorCodes.PASSWORD_LOAD, "context": {"path": str(self._storage_file)}},
            )
            raise ProcessingError("Could not read password storage.", code=ErrorCodes.PASSWORD_LOAD) from exc

    def save_entries(self, entries: list[PasswordEntry]) -> None:
        try:
            payload = [entry.to_dict() for entry in entries]
            self._storage_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
            logger.info(
                "Password entries saved",
                extra={"error_code": ErrorCodes.PASSWORD_SAVE, "context": {"count": len(entries), "path": str(self._storage_file)}},
            )
        except OSError as exc:
            logger.exception(
                "Failed to save password entries",
                extra={"error_code": ErrorCodes.PASSWORD_SAVE, "context": {"path": str(self._storage_file)}},
            )
            raise ProcessingError("Could not save password storage.", code=ErrorCodes.PASSWORD_SAVE) from exc

    def create_entry(self, service_name: str, username: str, password: str, url: str = "", notes: str = "") -> PasswordEntry:
        self._validate_required_fields(service_name, username, password)
        return PasswordEntry(
            entry_id=uuid4().hex,
            service_name=service_name.strip(),
            username=username.strip(),
            password=password,
            url=url.strip(),
            notes=notes.strip(),
        )

    def update_entry(self, entry: PasswordEntry, service_name: str, username: str, password: str, url: str = "", notes: str = "") -> PasswordEntry:
        self._validate_required_fields(service_name, username, password)
        entry.service_name = service_name.strip()
        entry.username = username.strip()
        entry.password = password
        entry.url = url.strip()
        entry.notes = notes.strip()
        return entry

    def _validate_required_fields(self, service_name: str, username: str, password: str) -> None:
        if not service_name.strip():
            raise ValidationError("Service name is required.", code=ErrorCodes.PASSWORD_VALIDATION)
        if not username.strip():
            raise ValidationError("Username is required.", code=ErrorCodes.PASSWORD_VALIDATION)
        if not password:
            raise ValidationError("Password is required.", code=ErrorCodes.PASSWORD_VALIDATION)
