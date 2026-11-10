import pytest
from app.schemas.usuarios import UsuarioCrear, UsuarioRespuesta
from app.services.usuarios import usuario_servicio


def test_crear_usuario_guarda_hash_y_no_la_contrasena(db):
    datos = UsuarioCrear(
        nombre="Operador Prueba",
        correo="operador.prueba@example.com",
        password="PruebaSegura123!",
    )

    usuario = usuario_servicio.crear_usuario(db, datos)

    assert usuario.id is not None
    assert usuario.password_hash != "PruebaSegura123!"
    assert usuario.password_hash.startswith("$argon2id$")
    assert usuario_servicio.verificar_contrasena(
        "PruebaSegura123!",
        usuario.password_hash,
    )


def test_crear_usuario_rechaza_correo_duplicado(db):
    datos = UsuarioCrear(
        nombre="Operador Uno",
        correo="duplicado@example.com",
        password="PruebaSegura123!",
    )

    usuario_servicio.crear_usuario(db, datos)

    with pytest.raises(Exception):
        usuario_servicio.crear_usuario(db, datos)


def test_usuario_respuesta_no_expone_contrasenas(db):
    datos = UsuarioCrear(
        nombre="Operador Prueba",
        correo="operador.prueba2@example.com",
        password="PruebaSegura123!",
    )
    usuario = usuario_servicio.crear_usuario(db, datos)

    respuesta = UsuarioRespuesta.model_validate(usuario)

    assert not hasattr(respuesta, "password_hash")
    assert "password_hash" not in respuesta.model_dump()
    assert "password" not in respuesta.model_dump()