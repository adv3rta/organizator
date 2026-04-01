from pathlib import Path

from app.services.password_storage_service import PasswordStorageService


def test_save_and_load_entries_roundtrip(tmp_path: Path) -> None:
    service = PasswordStorageService(tmp_path / "passwords.json")
    entry = service.create_entry("Mail", "user@example.com", "secret", "https://mail.test", "note")
    service.save_entries([entry])

    loaded = service.load_entries()

    assert len(loaded) == 1
    assert loaded[0].service_name == "Mail"
    assert loaded[0].username == "user@example.com"
    assert loaded[0].password == "secret"
