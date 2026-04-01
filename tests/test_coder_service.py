from app.services.coder_service import CoderService


def test_encode_decode_binary_roundtrip() -> None:
    service = CoderService()
    encoded = service.encode("Binary", "Hi")
    assert service.decode("Binary", encoded) == "Hi"


def test_encode_decode_caesar_roundtrip() -> None:
    service = CoderService()
    encoded = service.encode("Caesar", "Attack", 5)
    assert service.decode("Caesar", encoded, 5) == "Attack"
