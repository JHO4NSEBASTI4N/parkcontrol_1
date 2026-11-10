from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.permisos import ROL_ADMIN, modulos_del_rol, nombre_modulo, permisos_del_rol
from app.core.seguridad import decodificar_token
from app.database.connection import obtener_sesion
from app.models.usuarios import Usuario


esquema_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def obtener_usuario_actual(
    token: Annotated[str, Depends(esquema_oauth2)],
    db: Annotated[Session, Depends(obtener_sesion)],
) -> Usuario:
    error_credenciales = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        contenido = decodificar_token(token)
        identificador = contenido.get("sub")

        if not identificador:
            raise error_credenciales

        usuario_id = int(identificador)

    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise error_credenciales

    usuario = db.get(Usuario, usuario_id)

    if usuario is None or not usuario.estado:
        raise error_credenciales

    return usuario


def exigir_administrador(
    usuario: Annotated[Usuario, Depends(obtener_usuario_actual)],
) -> Usuario:
    if usuario.rol != ROL_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Esta acción requiere permisos de administrador. "
                "Tu sesión pertenece al módulo de operador."
            ),
        )

    return usuario


def exigir_permiso(permiso: str):
    """Fábrica de dependencias para validar un permiso concreto."""

    def validador(
        usuario: Annotated[Usuario, Depends(obtener_usuario_actual)],
    ) -> Usuario:
        if permiso not in permisos_del_rol(usuario.rol):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta operación.",
            )

        return usuario

    return validador


def datos_sesion(usuario: Usuario) -> dict:
    """Estructura que consume el frontend para pintar el módulo."""

    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "correo": usuario.correo,
        "rol": usuario.rol,
        "estado": usuario.estado,
        "modulo": nombre_modulo(usuario.rol),
        "modulos": modulos_del_rol(usuario.rol),
        "permisos": permisos_del_rol(usuario.rol),
    }
