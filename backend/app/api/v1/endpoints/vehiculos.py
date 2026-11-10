from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencias import exigir_administrador, obtener_usuario_actual
from app.database.connection import obtener_sesion
from app.schemas.vehiculos import (
    VehiculoActualizar,
    VehiculoCrear,
    VehiculoDetallado,
    VehiculoRespuesta,
)
from app.services.vehiculos import vehiculo_servicio

router = APIRouter(
    prefix="/api/vehiculos",
    tags=["Vehículos"],
)


# ==========================================
# LISTAR VEHÍCULOS
# ==========================================


@router.get("", response_model=list[VehiculoRespuesta])
def listar_vehiculos(
    db: Session = Depends(obtener_sesion),
    usuario_actual=Depends(obtener_usuario_actual),
):
    return vehiculo_servicio.listar_vehiculos(db)


@router.get("/detallados", response_model=list[VehiculoDetallado])
def listar_vehiculos_detallados(
    db: Session = Depends(obtener_sesion),
    usuario_actual=Depends(obtener_usuario_actual),
):
    """Vehículos con cliente, estado de permanencia y valor estimado."""

    return vehiculo_servicio.listar_detallados(db)


# ==========================================
# OBTENER VEHÍCULO POR ID
# ==========================================


@router.get("/{vehiculo_id}", response_model=VehiculoRespuesta)
def obtener_vehiculo(
    vehiculo_id: int,
    db: Session = Depends(obtener_sesion),
    usuario_actual=Depends(obtener_usuario_actual),
):
    try:
        return vehiculo_servicio.obtener_vehiculo(db, vehiculo_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error


# ==========================================
# CREAR VEHÍCULO
# ==========================================


@router.post("", response_model=VehiculoRespuesta, status_code=status.HTTP_201_CREATED)
def crear_vehiculo(
    datos: VehiculoCrear,
    db: Session = Depends(obtener_sesion),
    usuario_actual=Depends(obtener_usuario_actual),
):
    try:
        return vehiculo_servicio.crear_vehiculo(db, datos)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


# ==========================================
# ACTUALIZAR VEHÍCULO
# ==========================================


@router.put("/{vehiculo_id}", response_model=VehiculoRespuesta)
def actualizar_vehiculo(
    vehiculo_id: int,
    datos: VehiculoActualizar,
    db: Session = Depends(obtener_sesion),
    usuario_actual=Depends(obtener_usuario_actual),
):
    try:
        return vehiculo_servicio.actualizar_vehiculo(db, vehiculo_id, datos)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error


# ==========================================
# ACTIVAR / DESACTIVAR VEHÍCULO
# ==========================================


@router.patch("/{vehiculo_id}/desactivar", response_model=VehiculoRespuesta)
def desactivar_vehiculo(
    vehiculo_id: int,
    db: Session = Depends(obtener_sesion),
    usuario_actual=Depends(obtener_usuario_actual),
):
    try:
        return vehiculo_servicio.desactivar_vehiculo(db, vehiculo_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


@router.patch("/{vehiculo_id}/activar", response_model=VehiculoRespuesta)
def activar_vehiculo(
    vehiculo_id: int,
    db: Session = Depends(obtener_sesion),
    usuario_actual=Depends(obtener_usuario_actual),
):
    try:
        return vehiculo_servicio.cambiar_estado(db, vehiculo_id, True)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
