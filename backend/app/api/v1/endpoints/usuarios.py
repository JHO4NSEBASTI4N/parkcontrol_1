from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database.connection import obtener_sesion
from app.core.dependencias import (
    obtener_usuario_actual,
    exigir_administrador,
)
from app.models.usuarios import Usuario
from app.schemas.usuarios import (
    UsuarioCrear,
    UsuarioActualizar,
    UsuarioRespuesta,
)
from app.services.usuarios import usuario_servicio

router = APIRouter(
    prefix="/api/usuarios",
    tags=["Usuarios"],
)


# ==========================================
# LISTAR USUARIOS
# ==========================================


@router.get(
    "",
    response_model=list[UsuarioRespuesta],
)
def listar_usuarios(
    db: Session = Depends(obtener_sesion),
    administrador: Usuario = Depends(exigir_administrador),
):
    return usuario_servicio.listar_usuarios(db)


# ==========================================
# OBTENER USUARIO POR ID
# ==========================================


@router.get(
    "/{usuario_id}",
    response_model=UsuarioRespuesta,
)
def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(obtener_sesion),
    administrador: Usuario = Depends(exigir_administrador),
):
    try:
        return usuario_servicio.obtener_usuario(db, usuario_id)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


# ==========================================
# CREAR USUARIO
# ==========================================


@router.post(
    "",
    response_model=UsuarioRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def crear_usuario(
    datos: UsuarioCrear,
    db: Session = Depends(obtener_sesion),
    administrador: Usuario = Depends(exigir_administrador),
):
    try:
        return usuario_servicio.crear_usuario(db, datos)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No fue posible crear el usuario. Verifica que el correo no esté registrado.",
        )


# ==========================================
# ACTUALIZAR USUARIO
# ==========================================


@router.patch(
    "/{usuario_id}",
    response_model=UsuarioRespuesta,
)
def actualizar_usuario(
    usuario_id: int,
    datos: UsuarioActualizar,
    db: Session = Depends(obtener_sesion),
    administrador: Usuario = Depends(exigir_administrador),
):
    try:
        return usuario_servicio.actualizar_usuario(
            db,
            usuario_id,
            datos,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No fue posible actualizar el usuario. Verifica el correo electrónico.",
        )


# ==========================================
# ACTIVAR USUARIO
# ==========================================


@router.patch(
    "/{usuario_id}/activar",
    response_model=UsuarioRespuesta,
)
def activar_usuario(
    usuario_id: int,
    db: Session = Depends(obtener_sesion),
    administrador: Usuario = Depends(exigir_administrador),
):
    try:
        return usuario_servicio.activar_usuario(db, usuario_id)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


# ==========================================
# DESACTIVAR USUARIO
# ==========================================


@router.patch(
    "/{usuario_id}/desactivar",
    response_model=UsuarioRespuesta,
)
def desactivar_usuario(
    usuario_id: int,
    db: Session = Depends(obtener_sesion),
    administrador: Usuario = Depends(exigir_administrador),
):
    try:
        return usuario_servicio.desactivar_usuario(
            db,
            usuario_id,
            administrador.id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )