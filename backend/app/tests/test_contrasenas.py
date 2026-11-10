from pwdlib import PasswordHash


gestor_contrasenas = PasswordHash.recommended()


def test_generar_hash_seguro():
    contrasena = "PruebaSegura123!"

    hash_generado = gestor_contrasenas.hash(contrasena)

    assert hash_generado != contrasena
    assert hash_generado.startswith("$argon2id$")


def test_verificar_contrasena_correcta():
    contrasena = "PruebaSegura123!"
    hash_generado = gestor_contrasenas.hash(contrasena)

    assert gestor_contrasenas.verify(contrasena, hash_generado)


def test_rechazar_contrasena_incorrecta():
    contrasena = "PruebaSegura123!"
    hash_generado = gestor_contrasenas.hash(contrasena)

    assert not gestor_contrasenas.verify(
        "ContrasenaIncorrecta456!",
        hash_generado,
    )