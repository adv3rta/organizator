from app.services.password_generator_service import PasswordGeneratorService


def test_generate_password_respects_length() -> None:
    service = PasswordGeneratorService()
    generated = service.generate(20, True, True, True, True, False)
    assert len(generated) == 20


def test_generate_password_excludes_ambiguous_characters() -> None:
    service = PasswordGeneratorService()
    generated = service.generate(32, True, True, True, False, True)
    assert not any(character in PasswordGeneratorService.AMBIGUOUS for character in generated)
