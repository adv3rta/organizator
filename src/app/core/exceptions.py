from __future__ import annotations


class AppError(Exception):
    """Base application-level exception with a stable error code."""

    def __init__(self, message: str, code: str = "APP-000", user_message: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.user_message = user_message or message

    def __str__(self) -> str:
        return f"[{self.code}] {self.user_message}"


class ValidationError(AppError):
    """Raised when input does not pass validation."""

    def __init__(self, message: str, code: str = "VAL-001", user_message: str | None = None) -> None:
        super().__init__(message, code=code, user_message=user_message)


class ProcessingError(AppError):
    """Raised when a processing operation fails."""

    def __init__(self, message: str, code: str = "PRC-001", user_message: str | None = None) -> None:
        super().__init__(message, code=code, user_message=user_message)
