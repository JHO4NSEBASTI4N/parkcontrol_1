from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencias import obtener_usuario_actual
from app.database.connection import obtener_sesion
from app.models.usuarios import Usuario
from app.repositories.pagos import pago_repositorio
from app.schemas.pagos import PagoCrear, PagoDetallado, PagoRespuesta
from app.services.pagos import pago_servicio

router = APIRouter(
    prefix="/api/pagos",
    tags=["Pagos"],
)


# ==========================================
# LISTAR TODOS LOS PAGOS
# ==========================================


@router.get(
    "",
    response_model=list[PagoRespuesta],
    status_code=status.HTTP_200_OK,
)
def listar_pagos(
    db: Session = Depends(obtener_sesion),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    return pago_servicio.listar_pagos(db)


# ==========================================
# CONSULTAR UN PAGO POR ID
# ==========================================


@router.get(
    "/detallados",
    response_model=list[PagoDetallado],
    status_code=status.HTTP_200_OK,
)
def listar_pagos_detallados(
    db: Session = Depends(obtener_sesion),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    """Pagos con los datos del movimiento, vehículo y cliente."""

    return pago_servicio.listar_detallados(db)


@router.get(
    "/{pago_id}",
    response_model=PagoRespuesta,
    status_code=status.HTTP_200_OK,
)
def obtener_pago(
    pago_id: int,
    db: Session = Depends(obtener_sesion),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    try:
        return pago_servicio.obtener_pago(db, pago_id)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


# ==========================================
# REGISTRAR UN PAGO
# ==========================================


@router.post(
    "",
    response_model=PagoRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def registrar_pago(
    datos: PagoCrear,
    db: Session = Depends(obtener_sesion),
    usuario: Usuario = Depends(obtener_usuario_actual),
):
    try:
        return pago_servicio.registrar_pago(db, datos)

    except ValueError as error:
        mensaje = str(error)

        if mensaje == "El movimiento no existe.":
            codigo = status.HTTP_404_NOT_FOUND
        else:
            codigo = status.HTTP_400_BAD_REQUEST

        raise HTTPException(
            status_code=codigo,
            detail=mensaje,
        )

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este movimiento ya tiene un pago registrado.",
        )