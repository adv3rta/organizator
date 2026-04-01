from __future__ import annotations

import logging
import secrets

from app.core.error_codes import ErrorCodes
from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


class PasswordGeneratorService:
    """Generate passwords using Python's secrets module."""

    AMBIGUOUS = set("0OIl1|")
    SYMBOLS = "!@#$%^&*()_-+=[]{};:,.?/\\"

    def generate(
        self,
        length: int,
        use_lowercase: bool,
        use_uppercase: bool,
        use_digits: bool,
        use_symbols: bool,
        exclude_ambiguous: bool,
    ) -> str:
        pools: list[str] = []
        if use_lowercase:
            pools.append("abcdefghijklmnopqrstuvwxyz")
        if use_uppercase:
            pools.append("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        if use_digits:
            pools.append("0123456789")
        if use_symbols:
            pools.append(self.SYMBOLS)
        if not pools:
            raise ValidationError("Select at least one character set.", code=ErrorCodes.PASSWORD_GENERATION)
        if not 8 <= length <= 64:
            raise ValidationError("Password length must be between 8 and 64.", code=ErrorCodes.PASSWORD_GENERATION)

        if exclude_ambiguous:
            pools = ["".join(character for character in pool if character not in self.AMBIGUOUS) for pool in pools]
            pools = [pool for pool in pools if pool]
        if not pools:
            raise ValidationError("No valid characters remain after exclusions.", code=ErrorCodes.PASSWORD_GENERATION)

        alphabet = "".join(pools)
        generated = "".join(secrets.choice(alphabet) for _ in range(length))
        logger.info(
            "Password generated",
            extra={"error_code": ErrorCodes.PASSWORD_GENERATION, "context": {"length": length, "pool_count": len(pools)}},
        )
        return generated
