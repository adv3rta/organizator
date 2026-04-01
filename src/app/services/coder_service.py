from __future__ import annotations

import base64
import binascii
import string

from app.core.exceptions import ValidationError

MORSE_TABLE = {
    "A": ".-",
    "B": "-...",
    "C": "-.-.",
    "D": "-..",
    "E": ".",
    "F": "..-.",
    "G": "--.",
    "H": "....",
    "I": "..",
    "J": ".---",
    "K": "-.-",
    "L": ".-..",
    "M": "--",
    "N": "-.",
    "O": "---",
    "P": ".--.",
    "Q": "--.-",
    "R": ".-.",
    "S": "...",
    "T": "-",
    "U": "..-",
    "V": "...-",
    "W": ".--",
    "X": "-..-",
    "Y": "-.--",
    "Z": "--..",
    "0": "-----",
    "1": ".----",
    "2": "..---",
    "3": "...--",
    "4": "....-",
    "5": ".....",
    "6": "-....",
    "7": "--...",
    "8": "---..",
    "9": "----.",
    " ": "/",
}
MORSE_REVERSE = {value: key for key, value in MORSE_TABLE.items()}


class CoderService:
    def encode(self, method: str, text: str, shift: int = 3) -> str:
        if method == "Morse":
            return self._encode_morse(text)
        if method == "Binary":
            return " ".join(format(byte, "08b") for byte in text.encode("utf-8"))
        if method == "Base64":
            return base64.b64encode(text.encode("utf-8")).decode("ascii")
        if method == "Caesar":
            return self._shift(text, shift)
        raise ValidationError(f"Unsupported method: {method}")

    def decode(self, method: str, text: str, shift: int = 3) -> str:
        if method == "Morse":
            return self._decode_morse(text)
        if method == "Binary":
            return self._decode_binary(text)
        if method == "Base64":
            return self._decode_base64(text)
        if method == "Caesar":
            return self._shift(text, -shift)
        raise ValidationError(f"Unsupported method: {method}")

    def _encode_morse(self, text: str) -> str:
        encoded: list[str] = []
        for char in text.upper():
            if char not in MORSE_TABLE:
                raise ValidationError(f"Unsupported Morse character: {char}")
            encoded.append(MORSE_TABLE[char])
        return " ".join(encoded)

    def _decode_morse(self, text: str) -> str:
        symbols = [symbol for symbol in text.strip().split() if symbol]
        decoded: list[str] = []
        for symbol in symbols:
            if symbol not in MORSE_REVERSE:
                raise ValidationError(f"Invalid Morse symbol: {symbol}")
            decoded.append(MORSE_REVERSE[symbol])
        return "".join(decoded)

    def _decode_binary(self, text: str) -> str:
        chunks = [chunk for chunk in text.strip().split() if chunk]
        if not chunks:
            return ""
        try:
            data = bytes(int(chunk, 2) for chunk in chunks)
        except ValueError as exc:
            raise ValidationError("Binary input must contain only 0/1 groups.") from exc
        try:
            return data.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValidationError("Binary input is not valid UTF-8 text.") from exc

    def _decode_base64(self, text: str) -> str:
        try:
            raw = base64.b64decode(text.encode("ascii"), validate=True)
            return raw.decode("utf-8")
        except (binascii.Error, UnicodeDecodeError, ValueError) as exc:
            raise ValidationError("Base64 input is invalid.") from exc

    def _shift(self, text: str, amount: int) -> str:
        output: list[str] = []
        for char in text:
            if char.isalpha():
                alphabet = string.ascii_lowercase if char.islower() else string.ascii_uppercase
                index = alphabet.index(char)
                output.append(alphabet[(index + amount) % 26])
            else:
                output.append(char)
        return "".join(output)
