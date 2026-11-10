from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencias import obtener_usuario_actual
from app.database.connection import obtener_sesion
from app.models.usuarios import Usuario
from app.schemas.movimientos import (
    MovimientoCrear,
    MovimientoDetallado,
    MovimientoRespuesta,
)
from app.services.movimientos import movimiento_servicio

router = APIRouter(
    prefix="/api/movimientos",
    tags=["Movimientos"],
)


@router.get(
    "",
    response_model=list[MovimientoRespuesta],
    summary="Listar Movimientos",
)
def listar_movimientos(
    db: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    return movimiento_servicio.listar_movimientos(db)


@router.get(
    "/detallados",
    response_model=list[MovimientoDetallado],
    summary="Listar Movimientos Detallados",
)
def listar_movimientos_detallados(
    db: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    """Movimientos con vehículo, cliente, pago y cálculo en vivo."""

    return movimiento_servicio.listar_detallados(db)


@router.get(
    "/activos",
    response_model=list[MovimientoRespuesta],
    summary="Listar Movimientos Activos",
)
def listar_movimientos_activos(
    db: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    return movimiento_servicio.listar_activos(db)


@router.get(
    "/{movimiento_id}",
    response_model=MovimientoRespuesta,
    summary="Obtener Movimiento",
)
def obtener_movimiento(
    movimiento_id: int,
    db: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    try:
        return movimiento_servicio.obtener_movimiento(
            db,
            movimiento_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error


@router.post(
    "",
    response_model=MovimientoRespuesta,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar Entrada",
)
def registrar_entrada(
    datos: MovimientoCrear,
    db: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    try:
        # El usuario se obtiene de la sesión autenticada.
        datos_movimiento = MovimientoCrear(
            vehiculo_id=datos.vehiculo_id,
            usuario_ingreso_id=usuario_actual.id,
        )

        return movimiento_servicio.registrar_entrada(
            db,
            datos_movimiento,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


@router.patch(
    "/{movimiento_id}/salida",
    response_model=MovimientoRespuesta,
    summary="Registrar Salida",
)
def registrar_salida(
    movimiento_id: int,
    db: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    try:
        return movimiento_servicio.finalizar_salida(
            db,
            movimiento_id,
            usuario_salida_id=usuario_actual.id,
        )
    except ValueError as error:
        mensaje = str(error)

        codigo = (
            status.HTTP_404_NOT_FOUND
            if mensaje == "El movimiento no existe."
            else status.HTTP_400_BAD_REQUEST
        )

        raise HTTPException(
            status_code=codigo,
            detail=mensaje,
        ) from error